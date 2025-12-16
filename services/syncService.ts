
export class SyncService {
    private bpm: number = 120;
    private isPlaying: boolean = false;
    private nextPulseTime: number = 0;
    private lookahead: number = 25.0; // ms
    private scheduleAheadTime: number = 0.1; // s
    private timerID: number | undefined;
    private audioContext: AudioContext | null = null;
    private pulseCount: number = 0;
    
    // Callbacks
    public onTick: (pulse: number) => void = () => {};
    public onStart: () => void = () => {};
    public onStop: () => void = () => {};

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    setBpm(bpm: number) {
        this.bpm = bpm;
    }

    getBpm() { return this.bpm; }

    start() {
        if (this.isPlaying) return;
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isPlaying = true;
        this.pulseCount = 0;
        this.nextPulseTime = this.audioContext!.currentTime;
        this.scheduler();
        this.onStart();
    }

    stop() {
        this.isPlaying = false;
        window.clearTimeout(this.timerID);
        this.onStop();
    }

    private nextPulse() {
        const secondsPerBeat = 60.0 / this.bpm;
        const secondsPerPulse = secondsPerBeat / 24; // MIDI Clock is 24 PPQ
        this.nextPulseTime += secondsPerPulse;
        this.pulseCount++;
    }

    private scheduler() {
        // while there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        while (this.nextPulseTime < this.audioContext!.currentTime + this.scheduleAheadTime) {
            this.scheduleTick(this.nextPulseTime, this.pulseCount);
            this.nextPulse();
        }
        if (this.isPlaying) {
            this.timerID = window.setTimeout(this.scheduler.bind(this), this.lookahead);
        }
    }

    private scheduleTick(time: number, pulse: number) {
        // Calculate delay until the exact time
        const now = this.audioContext!.currentTime;
        const diff = time - now;
        
        // We use setTimeout to trigger the event closer to the actual audio time
        // In a real high-perf scenario, we might use the 'time' param to schedule WebAudio events directly,
        // but for external MIDI hardware, we send the message as close as possible.
        if (diff > 0) {
             setTimeout(() => {
                 if (this.isPlaying) this.onTick(pulse);
             }, diff * 1000);
        } else {
             if (this.isPlaying) this.onTick(pulse);
        }
    }
}
