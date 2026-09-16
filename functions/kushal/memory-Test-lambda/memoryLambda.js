
export const handler = async (event) => {
    console.log("MemoryTestLambda started");

    const chunks = [];

    try {
        // Continuously allocate memory.
        // Each chunk is approximately 10 MB.
        while (true) {
            const chunk = Buffer.alloc(
                10 * 1024 * 1024,
                "x"
            );

            chunks.push(chunk);

            console.log(
                `Allocated approximately ${
                    chunks.length * 10
                } MB`
            );

            // Small delay so CloudWatch logs show progress
            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );
        }
    } catch (error) {
        console.error(
            "Memory allocation failed:",
            error
        );

        throw error;
    }
};

