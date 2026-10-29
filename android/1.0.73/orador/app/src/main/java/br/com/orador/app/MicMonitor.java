package br.com.orador.app;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.audiofx.AutomaticGainControl;
import android.media.audiofx.NoiseSuppressor;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Local, volatile-memory-only microphone amplitude monitor for Interactive Rehearsal.
 * Never writes audio to disk, never stores buffers beyond a single ~30ms frame,
 * and never transmits audio over any network interface.
 */
public final class MicMonitor {
    private static final int[] AUDIO_SOURCES = new int[] {
        MediaRecorder.AudioSource.MIC,
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        MediaRecorder.AudioSource.DEFAULT
    };
    private static final int[] SAMPLE_RATES = new int[] { 16000, 44100, 48000, 8000 };

    private final Object lifecycleLock = new Object();
    private final Object statsLock = new Object();

    private volatile boolean running = false;
    private volatile int generation = 0;
    private volatile String errorCode = "";
    private Thread captureThread = null;

    private double windowSumSquares = 0.0;
    private int windowSampleCount = 0;
    private double lastChunkRms = 0.0;

    private static final class OpenedSession {
        final AudioRecord record;
        final int sampleRate;
        final NoiseSuppressor noiseSuppressor;
        final AutomaticGainControl gainControl;

        OpenedSession(AudioRecord record, int sampleRate, NoiseSuppressor ns, AutomaticGainControl agc) {
            this.record = record;
            this.sampleRate = sampleRate;
            this.noiseSuppressor = ns;
            this.gainControl = agc;
        }

        void close() {
            if (noiseSuppressor != null) {
                try { noiseSuppressor.release(); } catch (Throwable ignored) {}
            }
            if (gainControl != null) {
                try { gainControl.release(); } catch (Throwable ignored) {}
            }
            try {
                if (record.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    record.stop();
                }
            } catch (Throwable ignored) {}
            try { record.release(); } catch (Throwable ignored) {}
        }
    }

    private OpenedSession openAudioRecord(boolean startRecording, boolean[] hitSecurityError) {
        for (int attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) {
                try {
                    Thread.sleep(90L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return null;
                }
            }
            for (int source : AUDIO_SOURCES) {
                for (int rate : SAMPLE_RATES) {
                    int minBuf;
                    try {
                        minBuf = AudioRecord.getMinBufferSize(
                            rate,
                            AudioFormat.CHANNEL_IN_MONO,
                            AudioFormat.ENCODING_PCM_16BIT
                        );
                    } catch (Throwable t) {
                        continue;
                    }
                    if (minBuf <= 0) continue;

                    int bufferBytes = Math.max(minBuf * 2, (rate / 5) * 2);
                    AudioRecord candidate = null;
                    NoiseSuppressor ns = null;
                    AutomaticGainControl agc = null;
                    try {
                        candidate = new AudioRecord(
                            source,
                            rate,
                            AudioFormat.CHANNEL_IN_MONO,
                            AudioFormat.ENCODING_PCM_16BIT,
                            bufferBytes
                        );
                        if (candidate.getState() != AudioRecord.STATE_INITIALIZED) {
                            candidate.release();
                            candidate = null;
                            continue;
                        }
                        int sessionId = candidate.getAudioSessionId();
                        try {
                            if (NoiseSuppressor.isAvailable()) {
                                ns = NoiseSuppressor.create(sessionId);
                                if (ns != null) ns.setEnabled(true);
                            }
                        } catch (Throwable ignored) {}
                        try {
                            if (AutomaticGainControl.isAvailable()) {
                                agc = AutomaticGainControl.create(sessionId);
                                if (agc != null) agc.setEnabled(true);
                            }
                        } catch (Throwable ignored) {}

                        if (startRecording) {
                            candidate.startRecording();
                            if (candidate.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                                Thread.sleep(30L);
                            }
                            if (candidate.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                                new OpenedSession(candidate, rate, ns, agc).close();
                                candidate = null;
                                continue;
                            }
                        }
                        return new OpenedSession(candidate, rate, ns, agc);
                    } catch (SecurityException se) {
                        hitSecurityError[0] = true;
                        if (candidate != null) {
                            new OpenedSession(candidate, rate, ns, agc).close();
                        }
                        return null;
                    } catch (Throwable t) {
                        if (candidate != null) {
                            new OpenedSession(candidate, rate, ns, agc).close();
                        }
                    }
                }
            }
        }
        return null;
    }

    public String probe() {
        synchronized (lifecycleLock) {
            if (running && captureThread != null && captureThread.isAlive() && errorCode.isEmpty()) {
                return "ok";
            }
            boolean[] securityErr = new boolean[] { false };
            OpenedSession probeSession = openAudioRecord(true, securityErr);
            if (probeSession == null) {
                return securityErr[0] ? "permission-denied" : "mic-busy";
            }
            short[] scratch = new short[160];
            try {
                int read = probeSession.record.read(scratch, 0, scratch.length);
                Arrays.fill(scratch, (short) 0);
                if (read < 0 && read != AudioRecord.ERROR_INVALID_OPERATION) {
                    return "mic-busy";
                }
                return "ok";
            } catch (Throwable t) {
                return "mic-busy";
            } finally {
                Arrays.fill(scratch, (short) 0);
                probeSession.close();
            }
        }
    }

    public String start(final Runnable onUnexpectedLoss) {
        final CountDownLatch startedLatch = new CountDownLatch(1);
        final int myGen;
        synchronized (lifecycleLock) {
            stopLocked();
            synchronized (statsLock) {
                windowSumSquares = 0.0;
                windowSampleCount = 0;
                lastChunkRms = 0.0;
            }
            errorCode = "";
            running = true;
            myGen = ++generation;

            Thread worker = new Thread(() -> {
                boolean[] securityErr = new boolean[] { false };
                OpenedSession session = openAudioRecord(true, securityErr);
                if (session == null || !running || myGen != generation) {
                    if (session != null) session.close();
                    if (myGen == generation) {
                        errorCode = securityErr[0] ? "permission-denied" : "mic-busy";
                        running = false;
                    }
                    startedLatch.countDown();
                    return;
                }

                startedLatch.countDown();
                int frameSamples = Math.max(256, session.sampleRate / 32);
                short[] pcm = new short[frameSamples];
                int consecutiveErrors = 0;
                try {
                    while (running && myGen == generation && !Thread.currentThread().isInterrupted()) {
                        int n = session.record.read(pcm, 0, pcm.length);
                        if (n > 0) {
                            double sumSq = 0.0;
                            for (int i = 0; i < n; i++) {
                                double normalized = pcm[i] / 32768.0;
                                sumSq += normalized * normalized;
                                pcm[i] = 0;
                            }
                            double chunkRms = Math.sqrt(sumSq / n);
                            synchronized (statsLock) {
                                windowSumSquares += sumSq;
                                windowSampleCount += n;
                                lastChunkRms = chunkRms;
                            }
                            consecutiveErrors = 0;
                        } else if (n < 0) {
                            consecutiveErrors++;
                            if (consecutiveErrors >= 6) {
                                if (myGen == generation && running) {
                                    errorCode = "stream-lost";
                                    running = false;
                                    if (onUnexpectedLoss != null) {
                                        try { onUnexpectedLoss.run(); } catch (Throwable ignored) {}
                                    }
                                }
                                break;
                            }
                            try { Thread.sleep(20L); } catch (InterruptedException ie) { break; }
                        }
                    }
                } catch (Throwable t) {
                    if (myGen == generation && running) {
                        errorCode = "stream-lost";
                        running = false;
                        if (onUnexpectedLoss != null) {
                            try { onUnexpectedLoss.run(); } catch (Throwable ignored) {}
                        }
                    }
                } finally {
                    Arrays.fill(pcm, (short) 0);
                    session.close();
                }
            }, "SePrepare-MicVAD");
            worker.setDaemon(true);
            captureThread = worker;
            worker.start();
        }

        try {
            startedLatch.await(1500L, TimeUnit.MILLISECONDS);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }

        if (running && errorCode.isEmpty()) {
            return "ok";
        }
        return errorCode.isEmpty() ? "mic-busy" : errorCode;
    }

    public String poll() {
        String err = errorCode;
        if (err != null && !err.isEmpty()) {
            return MainActivity.object("ok", false, "code", err).toString();
        }
        if (!running) {
            return MainActivity.object("ok", false, "code", "stopped").toString();
        }
        double rms;
        synchronized (statsLock) {
            if (windowSampleCount > 0) {
                rms = Math.sqrt(windowSumSquares / windowSampleCount);
                windowSumSquares = 0.0;
                windowSampleCount = 0;
            } else {
                rms = lastChunkRms;
            }
        }
        if (!Double.isFinite(rms) || rms < 0.0) rms = 0.0;
        if (rms > 1.0) rms = 1.0;
        return MainActivity.object("ok", true, "rms", rms).toString();
    }

    public void stop() {
        synchronized (lifecycleLock) {
            stopLocked();
        }
    }

    private void stopLocked() {
        generation++;
        running = false;
        errorCode = "";
        Thread t = captureThread;
        captureThread = null;
        if (t != null && t != Thread.currentThread()) {
            t.interrupt();
            try {
                t.join(250L);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
        synchronized (statsLock) {
            windowSumSquares = 0.0;
            windowSampleCount = 0;
            lastChunkRms = 0.0;
        }
    }
}
