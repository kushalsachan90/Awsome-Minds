export const handler = async (event) => {
    console.log("Apply Fix Lambda received:", JSON.stringify(event));

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Apply Fix Lambda is working",
            event: event
        })
    };
};