import { callApi } from "../fetch";

export default {
    name: "checkNetwork",
    handler: async function (): Promise<boolean> {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await callApi("https://www.edulinkone.com/api/?networkCheck=true", {
                    method: "GET",
                });
                if (!response.ok) continue;
                return true;
            } catch (err) {
                if (err instanceof Error && (err.message && /network|fetch|timeout/i.test(err.message))) {
                    console.warn(`Network check attempt ${attempt} failed: ${err.message}`);
                    if (attempt < 3) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                } else if (typeof err === "string" && (err && /network|fetch|timeout/i.test(err))) {
                    console.warn(`Network check attempt ${attempt} failed: ${err}`);
                    if (attempt < 3) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    } else {
                        console.error("Unexpected error in network check:", err);
                        return false;
                    }
                }
            }
        }
        return false;
    }
};
