const ORDER = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
export function createLogger(input, minimumLevel) {
    async function write(level, message, extra = {}) {
        if (ORDER[level] < ORDER[minimumLevel])
            return;
        await input.client.app.log({
            body: {
                service: "superpowers-agent-router",
                level,
                message,
                extra,
            },
        });
    }
    return {
        debug: (message, extra) => write("debug", message, extra),
        info: (message, extra) => write("info", message, extra),
        warn: (message, extra) => write("warn", message, extra),
        error: (message, extra) => write("error", message, extra),
    };
}
