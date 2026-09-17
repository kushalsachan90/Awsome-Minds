export const handler = async () => {
    console.log("DisableTestLambda invoked");

    throw new Error(
        "Simulated critical application failure"
    );
};
