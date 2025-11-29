import axios from "axios";

export const sendToAI = async (message, token, familyData) => {
  const res = await axios.post(
    "/api/ai/chat",
    { message, familyData },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};
