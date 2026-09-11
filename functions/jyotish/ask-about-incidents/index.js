export const handler = async (event) => {
    console.log("Apply Fix Lambda received:", JSON.stringify(event));

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Ask About Incidents Lambda is working",
            event: event
        })
    };
};