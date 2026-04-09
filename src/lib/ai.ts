/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { storage } from "../storage";

/**
 * Lấy API Key từ storage hoặc fallback về process.env
 */
const getApiKey = async () => {
  const storedKey = await storage.get<string>("geminiApiKey");
  return storedKey || process.env.GEMINI_API_KEY;
};

export const generateReply = async (comment: string): Promise<string> => {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình Gemini API Key trong phần Cài đặt.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một môi giới bất động sản chuyên nghiệp. Hãy viết một câu trả lời ngắn gọn, lịch sự và thu hút cho bình luận sau đây trên Facebook: "${comment}"`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Xin lỗi, tôi không thể tạo câu trả lời lúc này.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Đã xảy ra lỗi khi kết nối với AI. Kiểm tra lại API Key.";
  }
};

/**
 * Nâng cấp: Tạo nhiều phiên bản nội dung (A/B Testing) với kiểm tra tiêu chuẩn cộng đồng
 */
export const generateMultiplePosts = async (data: { 
  type: string, 
  location: string, 
  price: string, 
  features: string[],
  goal: string,
  numVariations: number 
}): Promise<string[]> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Vui lòng cấu hình Gemini API Key.");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Bạn là chuyên gia Content Marketing Bất động sản lão luyện. 
    Hãy tạo ra ${data.numVariations} phiên bản bài đăng Facebook khác nhau cho thông tin sau:
    - Loại hình: ${data.type}
    - Vị trí: ${data.location}
    - Giá: ${data.price}
    - Đặc điểm: ${data.features.join(", ")}
    - Mục tiêu: ${data.goal}

    Yêu cầu các phiên bản phải có phong cách khác nhau:
    1. Hài hước, gần gũi.
    2. Chuyên nghiệp, tin cậy.
    3. Gây tò mò, bí ẩn.
    4. Tập trung vào con số, lợi nhuận đầu tư.
    5. Ngắn gọn, súc tích (Brutalist).

    QUAN TRỌNG (Compliance): 
    - Tuân thủ Tiêu chuẩn cộng đồng Facebook (Check FB Community Standards).
    - Tránh các từ khóa nhạy cảm dễ bị bóp tương tác hoặc đánh dấu spam như: "cam kết 100%", "lợi nhuận chắc chắn", "lừa đảo", "giàu nhanh".
    - Sử dụng ngôn từ khéo léo để mô tả giá trị.

    Định dạng trả về: Một mảng JSON các chuỗi (strings). Mỗi chuỗi là một bài đăng hoàn chỉnh gồm Tiêu đề, Nội dung, CTA và Hashtag.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Multi-Post Generation Error:", error);
    return ["Lỗi khi tạo nội dung AI."];
  }
};

/**
 * Phân loại nhân khẩu học thành viên dựa trên tên (Sử dụng AI)
 */
export const classifyMembers = async (
  members: { uid: string, name: string }[],
  filters: { gender: string, age: string }
): Promise<{ uid: string, name: string, gender: string, ageGroup: string }[]> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Vui lòng cấu hình Gemini API Key.");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Bạn là chuyên gia phân tích nhân khẩu học Việt Nam. 
    Dựa vào danh sách tên sau, hãy dự đoán Giới tính và Độ tuổi cho từng người.
    
    Quy tắc dự đoán:
    - Giới tính: Dựa vào tên đệm và tên chính (VD: 'Thị' -> Nữ, 'Văn' -> Nam).
    - Độ tuổi: Dự đoán qua cách đặt tên (VD: Tên tiếng Anh/GenZ -> Trẻ, Tên truyền thống -> Trung niên).
    - Nhãn Độ tuổi: "Trẻ (18-25)", "Trung niên (26-45)", "Chủ đầu tư (45+)".
    - Nhãn Giới tính: "Nam", "Nữ".

    Danh sách tên:
    ${members.map(m => m.name).join(", ")}

    Yêu cầu: Trả về một mảng JSON các đối tượng có cấu trúc: 
    {"name": "...", "gender": "Nam/Nữ", "ageGroup": "..."}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              gender: { type: Type.STRING },
              ageGroup: { type: Type.STRING }
            },
            required: ["name", "gender", "ageGroup"]
          }
        }
      }
    });

    const classifications = JSON.parse(response.text || "[]");
    
    // Kết hợp kết quả phân loại với UID gốc và lọc theo yêu cầu người dùng
    return members.map(m => {
      const info = classifications.find((c: any) => c.name === m.name);
      return {
        uid: m.uid,
        name: m.name,
        gender: info?.gender || "Không xác định",
        ageGroup: info?.ageGroup || "Không xác định"
      };
    }).filter(m => {
      const matchGender = filters.gender === "all" || m.gender === filters.gender;
      const matchAge = filters.age === "all" || m.ageGroup.includes(filters.age);
      return matchGender && matchAge;
    });
  } catch (error) {
    console.error("AI Classification Error:", error);
    return members.map(m => ({ ...m, gender: "N/A", ageGroup: "N/A" }));
  }
};

/**
 * Tạo tin nhắn kết bạn cá nhân hóa
 */
export const generateFriendRequestMessage = async (name: string, goal: string): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Vui lòng cấu hình Gemini API Key.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Bạn là một môi giới BĐS chuyên nghiệp. Hãy viết 1 tin nhắn ngắn gọn (dưới 30 từ) để gửi kèm lời mời kết bạn cho ${name}. 
  Mục tiêu là: ${goal}. 
  Yêu cầu: Thân thiện, không spam, tạo cảm giác muốn kết nối.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.7 }
    });

    return response.text || `Chào ${name}, mình thấy chúng ta có cùng quan tâm về BĐS, rất vui được kết nối!`;
  } catch (error) {
    console.error("AI Friend Message Error:", error);
    return `Chào ${name}, rất vui được kết nối với bạn!`;
  }
};

/**
 * Tạo bình luận tương tác dựa trên nội dung bài viết
 */
export const generateInteractionComment = async (postContent: string): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Vui lòng cấu hình Gemini API Key.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Dựa trên nội dung bài viết sau: "${postContent}". 
  Hãy viết 1 câu bình luận ngắn gọn, tự nhiên, tích cực để tương tác. 
  Yêu cầu: Không dùng icon quá đà, không quảng cáo lộ liễu, giống người thật đang khen ngợi hoặc góp ý.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.7 }
    });

    return response.text || "Bài viết hay quá bạn ơi! Chúc bạn ngày mới tốt lành.";
  } catch (error) {
    console.error("AI Interaction Comment Error:", error);
    return "Bài viết hay quá! Chúc bạn ngày mới tốt lành.";
  }
};
