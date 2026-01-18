// How the component will render:
const template = `
    <div class="gametime">
        <!-- <div class="timerTitle">time played at 4x game-speed</div> -->
        <div class="gametimeClock">{{time}}</div>
        <div class="gametimeFrames">{{frames}}</div>
    </div>
`

module.exports = {
    template,
    props: {
        emulatorStats: {
            type: Object,
            default: () => null
        }
    },
    setup(props) {
        // Helper function to format numbers with leading zeros (same as Timer.js)
        const f = (x) => x.toString().padStart(2, "0");
        
        // Use computed properties that directly access props - they'll automatically be reactive
        const time = Vue.computed(() => {
            const ms = props.emulatorStats?.time_current ?? null;
            
            if (!ms && ms !== 0) {
                return "0";
            }
            
            // Calculate hours, minutes, seconds (same calculation as Timer.js)
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            // Progressive format matching Timer.js update() method:
            // If hours != 0: h:mm:ss
            // Else if minutes != 0: m:ss
            // Else: s
            if (hours != 0) {
                return hours + ":" + f(minutes) + ":" + f(seconds);
            } else if (minutes != 0) {
                return minutes + ":" + f(seconds);
            } else {
                return seconds.toString();
            }
        });
        
        const frames = Vue.computed(() => {
            const ms = props.emulatorStats?.time_current ?? null;
            
            if (!ms && ms !== 0) {
                return ".00";
            }
            
            // Centiseconds: divide by 10, then mod 100 (same as Timer.js line 88)
            const centiseconds = Math.floor((ms / 10) % 100);
            return "." + f(centiseconds);
        });
        
        // Everything we return here can be accessed by other functions (and the rendering) of the component:
        return {
            time,
            frames
        }
    }
}
