import { callApi } from "../fetch";

export default {
    name: "checkNetwork",
    handler: async function (): Promise<boolean> {
        try {
            const response = await callApi("https://www.edulinkone.com/api/?networkCheck=true", {
                method: "GET",
            });
            console.log(response)

            if (!response.ok) {
                return false;
            }
            return true;
        } catch (err) {
            if (err instanceof TypeError) {
                console.log("Network error: probably offline or server unreachable");
            } else {
                console.log("Unexpected error:", err);
            }
            return false
        }
    },
};
