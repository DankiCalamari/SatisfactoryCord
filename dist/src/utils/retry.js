export async function retry(fn, attempts = 5, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < attempts)
                await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}
