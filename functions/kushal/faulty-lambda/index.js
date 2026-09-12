export const handler = async (event) => {
    console.log("Faulty Lambda invoked");

    throw new Error("Simulated infrastructure failure");
};