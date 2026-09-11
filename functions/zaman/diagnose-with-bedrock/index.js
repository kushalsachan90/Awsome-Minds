export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event));

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Diagnose Lambda is working",
            event: event
        })
    };
};