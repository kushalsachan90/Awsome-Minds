export const handler = async (event) => {
    console.log("Faulty Lambda v6 invoked");

    throw new Error("Simulated infrastructure failure");
};