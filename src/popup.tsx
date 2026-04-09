/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  User, 
  LayoutDashboard, 
  Send, 
  Search, 
  Settings, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  Facebook,
  MessageSquareText,
  Sparkles,
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  PenLine,
  Users,
  Filter,
  Lightbulb,
  FileText,
  Zap,
  Shield,
  Database,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage, getAuthState, type AuthState } from "./storage";
import { generateMultiplePosts, classifyMembers, generateFriendRequestMessage } from "./lib/ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for tailwind classes
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Tab = "dashboard" | "groups" | "insights" | "settings" | "leads" | "friends";

interface Group {
  id: string;
  name: string;
  members: number;
  status: "active" | "pending" | "blocked";
}

interface Lead {
  uid: string;
  name: string;
  gender?: string;
  ageGroup?: string;
}

const Popup = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [authState, setAuthState] = useState<AuthState>({
    uid: null,
    userName: null,
    token: null,
    isConnected: false,
    lastSync: null,
    geminiApiKey: null
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);

  // Group Management State
  const [groups, setGroups] = useState<Group[]>([
    { id: "1", name: "Cộng đồng BĐS Sài Gòn", members: 45000, status: "active" },
    { id: "2", name: "Hội Review Căn Hộ", members: 12000, status: "active" },
    { id: "3", name: "Mua Bán Nhà Đất Quận 2", members: 8500, status: "pending" },
  ]);
  const [groupFilter, setGroupFilter] = useState({ keyword: "", minMembers: 0 });
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  
  // Load leads and scheduled posts from storage on init
  useEffect(() => {
    storage.get<Lead[]>("scrapedLeads").then(leads => {
      if (leads) setScrapedLeads(leads);
    });
    storage.get<any[]>("scheduledPosts").then(posts => {
      if (posts) setScheduledPosts(posts || []);
    });
  }, []);

  // Save leads to storage whenever they change
  useEffect(() => {
    storage.set("scrapedLeads", scrapedLeads);
  }, [scrapedLeads]);
  const [scrapeFilters, setScrapeFilters] = useState({ gender: "all", age: "all" });
  const [isSearchingGroups, setIsSearchingGroups] = useState(false);

  // AI Post State
  const [postData, setPostData] = useState({
    type: "Căn hộ chung cư",
    location: "Quận 2, TP.HCM",
    price: "3.5 tỷ",
    features: ["View sông", "Full nội thất", "Sổ hồng riêng"],
    goal: "find_buyer" as "find_buyer" | "find_tenant" | "news" | "urgent",
    numVariations: 3
  });
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [friendActivityFilter, setFriendActivityFilter] = useState(5); // 5 months
  const [unfriendActivityFilter, setUnfriendActivityFilter] = useState(3); // 3 months

  // Settings State
  const [settings, setSettings] = useState({
    geminiApiKey: "",
    supabaseUrl: "",
    supabaseKey: ""
  });

  // Lấy dữ liệu từ storage khi khởi tạo
  useEffect(() => {
    const init = async () => {
      const state = await getAuthState();
      setAuthState(state);
      
      const sUrl = await storage.get<string>("supabaseUrl");
      const sKey = await storage.get<string>("supabaseKey");
      setSettings({
        geminiApiKey: state.geminiApiKey || "",
        supabaseUrl: sUrl || "",
        supabaseKey: sKey || ""
      });
    };
    init();

    // Lắng nghe thay đổi từ storage
    const watchKeys = ["uid", "userName", "token", "isConnected", "lastSync", "geminiApiKey"];
    const unsubscribes = watchKeys.map(key => 
      storage.watch({
        [key]: (c) => {
          setAuthState(prev => ({ 
            ...prev, 
            [key]: key === "isConnected" ? !!c.newValue : c.newValue 
          }));
        }
      })
    );

    return () => {
      unsubscribes.forEach((unsub: any) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, []);

  // Tự động ẩn toast sau 3 giây
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "info" | "error" = "info") => {
    setToast({ message, type });
  };

  const handleScan = () => {
    setIsScanning(true);
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.cookies) {
      chrome.runtime.sendMessage({ action: "SCAN_COOKIES" }, (response) => {
        setIsScanning(false);
        if (response?.success) {
          const welcomeMsg = response.name ? `Chào ${response.name}, đã kết nối Facebook!` : "Đã cập nhật kết nối Facebook!";
          showToast(welcomeMsg, "success");
        } else {
          showToast(response?.error || "Thất bại. Vui lòng mở Facebook ở tab bên cạnh và đăng nhập thủ công.", "error");
        }
      });
    } else {
      // Trong môi trường Preview, giải thích rõ cho người dùng
      setTimeout(() => {
        setIsScanning(false);
        showToast("Vui lòng cài đặt Extension vào Chrome để sử dụng tính năng đăng nhập thực.", "info");
        // Vẫn cho phép Mock để người dùng xem giao diện nếu họ muốn
        setAuthState(prev => ({ 
          ...prev, 
          isConnected: true, 
          uid: "1000888999222", 
          userName: "Người dùng Demo" 
        }));
      }, 1000);
    }
  };

  const handleOpenFacebook = () => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "OPEN_FACEBOOK" });
    } else {
      window.open("https://www.facebook.com", "_blank");
    }
  };

  const handleSearchGroups = () => {
    setIsSearchingGroups(true);
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "SEARCH_GROUPS", filters: groupFilter }, (response) => {
        setIsSearchingGroups(false);
        if (response?.success) {
          setGroups(response.groups);
          showToast(`Tìm thấy ${response.groups.length} nhóm phù hợp!`, "success");
        } else {
          showToast("Không tìm thấy nhóm hoặc lỗi API.", "error");
        }
      });
    } else {
      setTimeout(() => {
        setIsSearchingGroups(false);
        showToast("Mock: Đã cập nhật danh sách nhóm!", "success");
      }, 1000);
    }
  };

  const handleScrapeMembers = async () => {
    setIsScanning(true);
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "SCRAPE_MEMBERS" }, async (response) => {
        if (response?.success) {
          showToast(`Đã quét ${response.members.length} người. Đang phân loại AI...`, "info");
          try {
            const classified = await classifyMembers(response.members, scrapeFilters);
            setScrapedLeads(classified);
            showToast(`Hoàn tất! Đã lọc được ${classified.length} khách hàng mục tiêu.`, "success");
          } catch (error) {
            showToast("Lỗi phân loại AI: " + (error as Error).message, "error");
            setScrapedLeads(response.members);
          }
        } else {
          showToast("Lỗi khi quét. Hãy mở trang thành viên nhóm FB.", "error");
        }
        setIsScanning(false);
      });
    } else {
      setTimeout(async () => {
        const mockMembers = [
          { uid: "123", name: "Nguyễn Văn A" }, 
          { uid: "456", name: "Trần Thị B" },
          { uid: "789", name: "Lê Văn C" }
        ];
        const classified = await classifyMembers(mockMembers, scrapeFilters);
        setScrapedLeads(classified);
        setIsScanning(false);
        showToast("Mock: Đã quét và phân loại AI!", "success");
      }, 1500);
    }
  };

  const handleSaveLeads = () => {
    if (scrapedLeads.length === 0) return;
    setIsScanning(true);
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "SAVE_LEADS", leads: scrapedLeads }, (response) => {
        setIsScanning(false);
        if (response?.success) {
          showToast(`Đã lưu ${response.count} khách hàng vào Supabase!`, "success");
          setScrapedLeads([]);
        } else {
          showToast("Lỗi: " + response.error, "error");
        }
      });
    } else {
      setTimeout(() => {
        setIsScanning(false);
        showToast("Mock: Đã lưu Lead vào Supabase!", "success");
        setScrapedLeads([]);
      }, 1000);
    }
  };

  const handleGeneratePost = async () => {
    setIsGenerating(true);
    try {
      const variations = await generateMultiplePosts(postData);
      setAiVariations(variations);
      showToast("Đã tạo nội dung AI thành công!", "success");
    } catch (error) {
      showToast((error as Error).message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostNow = (content: string) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "AUTO_FILL_POST", content });
          showToast("Đã gửi nội dung vào tab Facebook!", "success");
        } else {
          showToast("Vui lòng mở tab Facebook đang hoạt động.", "error");
        }
      });
    } else {
      showToast("Mock: Đã đăng bài thành công!", "success");
    }
  };

  const handleSchedulePost = (content: string) => {
    if (!scheduleTime) {
      showToast("Vui lòng chọn thời gian đăng bài.", "error");
      return;
    }

    // Lấy URL hiện tại nếu đang ở trang nhóm Facebook
    let groupUrl = "https://www.facebook.com";
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url?.includes("facebook.com/groups/")) {
          groupUrl = tabs[0].url;
        }
        
        const newPost = {
          id: Date.now().toString(),
          content,
          scheduledAt: scheduleTime,
          status: "pending",
          createdAt: new Date().toISOString(),
          groupUrl
        };

        if (chrome.runtime) {
          chrome.runtime.sendMessage({ action: "SCHEDULE_POST", post: newPost }, (response) => {
            if (response?.success) {
              setScheduledPosts(prev => [...prev, newPost]);
              showToast("Đã lên lịch đăng bài!", "success");
            }
          });
        }
      });
    } else {
      const newPost = {
        id: Date.now().toString(),
        content,
        scheduledAt: scheduleTime,
        status: "pending",
        createdAt: new Date().toISOString(),
        groupUrl
      };
      setScheduledPosts(prev => [...prev, newPost]);
      showToast("Mock: Đã lên lịch đăng bài!", "success");
    }
  };

  const handleOpenGroup = (groupId: string) => {
    const url = `https://www.facebook.com/groups/${groupId}`;
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "OPEN_TAB", url });
    } else {
      window.open(url, "_blank");
    }
  };

  const handleJoinSelectedGroups = () => {
    if (selectedGroups.length === 0) {
      showToast("Vui lòng chọn ít nhất một nhóm.", "error");
      return;
    }
    chrome.runtime.sendMessage({ action: "JOIN_GROUPS", groupIds: selectedGroups }, (response) => {
      if (response?.success) {
        showToast(`Đang gửi yêu cầu tham gia ${selectedGroups.length} nhóm...`, "success");
        setSelectedGroups([]);
      }
    });
  };

  const handleUnfriendInactive = () => {
    chrome.runtime.sendMessage({ action: "UNFRIEND_INACTIVE", months: unfriendActivityFilter }, (response) => {
      if (response?.success) {
        showToast(`Bắt đầu lọc bạn bè không hoạt động trong ${unfriendActivityFilter} tháng.`, "success");
      }
    });
  };

  const handleAddFriendWithAI = async (lead: any) => {
    try {
      const msg = await generateFriendRequestMessage(lead.name, "Kết nối để trao đổi về cơ hội đầu tư BĐS");
      chrome.runtime.sendMessage({ 
        action: "SEND_FRIEND_REQUEST", 
        uid: lead.uid, 
        name: lead.name, 
        message: msg 
      }, (response) => {
        if (response?.success) {
          showToast(`Đã gửi lời mời kết bạn cho ${lead.name}`, "success");
        }
      });
    } catch (error) {
      showToast("Lỗi khi tạo tin nhắn AI.", "error");
    }
  };

  const handleSaveSettings = async () => {
    await storage.set("geminiApiKey", settings.geminiApiKey);
    await storage.set("supabaseUrl", settings.supabaseUrl);
    await storage.set("supabaseKey", settings.supabaseKey);
    setAuthState(prev => ({ ...prev, geminiApiKey: settings.geminiApiKey }));
    showToast("Đã lưu cấu hình!", "success");
    setShowSettings(false);
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(groupFilter.keyword.toLowerCase()) && 
    g.members >= groupFilter.minMembers
  );

  return (
    <div className="w-[380px] h-[600px] bg-slate-50 flex flex-col font-sans text-slate-900 shadow-xl overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "absolute top-16 left-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center gap-2 text-xs font-medium",
              toast.type === "success" ? "bg-green-600 text-white" : 
              toast.type === "error" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
            )}
          >
            {toast.type === "success" ? <CheckCircle2 size={16} /> : 
             toast.type === "error" ? <AlertCircle size={16} /> : <Sparkles size={16} />}
            <span className="flex-1">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 overflow-hidden relative">
            {authState.uid ? (
              <img 
                src={`https://graph.facebook.com/${authState.uid}/picture?type=square`} 
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=FB&background=0D8ABC&color=fff";
                }}
              />
            ) : (
              <User size={20} />
            )}
            <div className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
              authState.isConnected ? "bg-green-500" : "bg-slate-300"
            )} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">
              {authState.userName || "FB AI Automation"}
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              {authState.uid ? `UID: ${authState.uid}` : "Chưa kết nối Facebook"}
            </p>
          </div>
        </div>
        <button 
          onClick={handleScan}
          disabled={isScanning}
          className={cn(
            "p-2 rounded-lg hover:bg-slate-100 transition-colors",
            isScanning && "animate-spin text-blue-500"
          )}
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {!authState.isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
              <Facebook size={40} className="text-blue-600" />
            </div>
            <div className="text-center space-y-2 px-4">
              <h2 className="text-lg font-bold text-slate-800">Kết nối Facebook</h2>
              <p className="text-sm text-slate-500">Vui lòng đăng nhập Facebook để kích hoạt các tính năng AI Marketing.</p>
            </div>
            <button 
              onClick={handleOpenFacebook}
              className="w-full max-w-[280px] bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              Mở Facebook để kết nối
              <ExternalLink size={18} />
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Trạng thái AI</p>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold">Sẵn sàng</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Kết nối Cloud</p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold">Đã bảo mật</span>
                    </div>
                  </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton 
                    icon={<Send size={18} />} 
                    label="Đăng bài AI" 
                    description="Tạo nội dung A/B Testing"
                    color="bg-blue-600"
                    onClick={() => setShowPostEditor(true)}
                  />
                  <ActionButton 
                    icon={<Users size={18} />} 
                    label="Quản lý Nhóm" 
                    description="Quét & Target khách hàng"
                    color="bg-indigo-600"
                    onClick={() => setActiveTab("groups")}
                  />
                  <ActionButton 
                    icon={<MessageSquareText size={18} />} 
                    label="Phản hồi" 
                    description="Tự động trả lời AI"
                    color="bg-emerald-600"
                    onClick={() => showToast("Đang phát triển...", "info")}
                  />
                  <ActionButton 
                    icon={<Settings size={18} />} 
                    label="Cài đặt" 
                    description="Cấu hình API & Cloud"
                    color="bg-slate-700"
                    onClick={() => setShowSettings(true)}
                  />
                </div>

                {/* AI Insights Preview */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      AI Insights Mới
                    </h3>
                    <button onClick={() => setActiveTab("insights")} className="text-[10px] text-blue-600 font-bold hover:underline">Xem tất cả</button>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[11px] text-slate-600 italic leading-relaxed">"Gợi ý: Các bài đăng có hình ảnh thực tế căn hộ Quận 2 đang có tương tác cao hơn 40%..."</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "groups" && (
              <motion.div 
                key="groups"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">Quản lý Nhóm</h2>
                  <button 
                    onClick={handleSearchGroups}
                    disabled={isSearchingGroups}
                    className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSearchingGroups ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                    Tìm Nhóm Mới
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Từ khóa tên nhóm..."
                        className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        value={groupFilter.keyword}
                        onChange={(e) => setGroupFilter({...groupFilter, keyword: e.target.value})}
                      />
                    </div>
                    <select 
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] outline-none"
                      value={groupFilter.minMembers}
                      onChange={(e) => setGroupFilter({...groupFilter, minMembers: parseInt(e.target.value)})}
                    >
                      <option value="0">Tất cả quy mô</option>
                      <option value="1000">1k+ mem</option>
                      <option value="5000">5k+ mem</option>
                      <option value="10000">10k+ mem</option>
                      <option value="50000">50k+ mem</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Cấu hình Quét AI</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] outline-none"
                        value={scrapeFilters.gender}
                        onChange={(e) => setScrapeFilters({...scrapeFilters, gender: e.target.value})}
                      >
                        <option value="all">Mọi giới tính</option>
                        <option value="Nam">Chỉ Nam</option>
                        <option value="Nữ">Chỉ Nữ</option>
                      </select>
                      <select 
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] outline-none"
                        value={scrapeFilters.age}
                        onChange={(e) => setScrapeFilters({...scrapeFilters, age: e.target.value})}
                      >
                        <option value="all">Mọi độ tuổi</option>
                        <option value="Trẻ">Trẻ (18-25)</option>
                        <option value="Trung niên">Trung niên (26-45)</option>
                        <option value="Chủ đầu tư">Chủ đầu tư (45+)</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleScrapeMembers}
                      disabled={isScanning}
                      className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isScanning ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                      Bắt đầu Quét & Phân loại AI
                    </button>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedGroups.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100"
                  >
                    <span className="text-[11px] font-medium text-blue-700">Đã chọn {selectedGroups.length} nhóm</span>
                    <button 
                      onClick={handleJoinSelectedGroups}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 shadow-sm"
                    >
                      Tham gia nhóm đã chọn
                    </button>
                  </motion.div>
                )}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Kết quả tìm kiếm / Nhóm của tôi</span>
                    <span className="text-[10px] text-slate-400">{groups.length} nhóm</span>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="p-2 w-8">
                            <input 
                              type="checkbox" 
                              onChange={(e) => {
                                if (e.target.checked) setSelectedGroups(groups.map(g => g.id));
                                else setSelectedGroups([]);
                              }}
                              checked={selectedGroups.length === groups.length && groups.length > 0}
                            />
                          </th>
                          <th className="p-2 font-bold text-slate-600">Tên Nhóm</th>
                          <th className="p-2 font-bold text-slate-600">Thành Viên</th>
                          <th className="p-2 font-bold text-slate-600">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.length > 0 ? groups.map(group => (
                          <tr key={group.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="p-2">
                              <input 
                                type="checkbox" 
                                checked={selectedGroups.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedGroups(prev => [...prev, group.id]);
                                  else setSelectedGroups(prev => prev.filter(id => id !== group.id));
                                }}
                              />
                            </td>
                            <td className="p-2 font-medium">
                              <button 
                                onClick={() => handleOpenGroup(group.id)}
                                className="text-blue-600 hover:underline text-left truncate max-w-[150px] font-semibold"
                              >
                                {group.name}
                              </button>
                            </td>
                            <td className="p-2 text-slate-500">{group.members.toLocaleString()}</td>
                            <td className="p-2">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                group.status === 'active' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
                              )}>
                                {group.status === 'active' ? "Đã tham gia" : "Chưa tham gia"}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                              Chưa có dữ liệu nhóm. Nhấn "Tìm Nhóm Mới" để bắt đầu.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Scraped Leads Preview */}
                {scrapedLeads.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-blue-700">Đã quét: {scrapedLeads.length} Lead mới</p>
                      <button 
                        onClick={handleSaveLeads}
                        className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Database size={10} /> Lưu vào Supabase
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                      {scrapedLeads.map((lead, i) => (
                        <div key={i} className="text-[10px] text-slate-600 flex items-center justify-between bg-white p-1.5 rounded border border-blue-50">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                              lead.gender === "Nam" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
                            )}>
                              {lead.gender === "Nam" ? "M" : "F"}
                            </span>
                            <span className="font-medium">{lead.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleAddFriendWithAI(lead)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Kết bạn & Nhắn tin AI"
                            >
                              <User size={12} />
                            </button>
                            <span className="text-slate-400 font-mono text-[8px]">{lead.uid}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "insights" && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-800">AI Insights & Học Tập</h2>
                <div className="space-y-3">
                  {[
                    { title: "Mẫu tin Bán Căn Hộ Hot", engagement: "2.4k", content: "🔥 SIÊU PHẨM QUẬN 2 - VIEW SÔNG TRỰC DIỆN..." },
                    { title: "Mẫu tin Tìm Khách Thuê", engagement: "1.8k", content: "🏠 CĂN HỘ STUDIO FULL NỘI THẤT - GIÁ CHỈ 8TR..." },
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-700">{item.title}</h4>
                        <span className="text-[10px] text-green-600 font-bold">+{item.engagement} tương tác</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic leading-relaxed">"{item.content}"</p>
                      <button className="mt-2 text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Sparkles size={10} /> Dùng làm mẫu học tập
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "friends" && (
              <motion.div 
                key="friends"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <User size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Quản lý Bạn bè & Hoạt động</h3>
                      <p className="text-[11px] text-slate-500">Lọc và tương tác tự động với danh sách bạn bè.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-600">Lọc kết bạn (Tháng)</label>
                      <input 
                        type="number" 
                        value={friendActivityFilter}
                        onChange={(e) => setFriendActivityFilter(parseInt(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-400 italic">Chỉ kết bạn với người hoạt động trong {friendActivityFilter} tháng qua.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-600">Lọc hủy kết bạn (Tháng)</label>
                      <input 
                        type="number" 
                        value={unfriendActivityFilter}
                        onChange={(e) => setUnfriendActivityFilter(parseInt(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-[9px] text-slate-400 italic">Hủy kết bạn nếu không hoạt động trong {unfriendActivityFilter} tháng.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handleUnfriendInactive}
                      className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Bắt đầu lọc & Hủy kết bạn
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    <b>Lưu ý:</b> Tính năng này sẽ quét danh sách bạn bè của bạn. Quá trình có thể mất vài phút tùy vào số lượng bạn bè. AI sẽ tự động phân tích bài viết mới nhất để xác định mức độ hoạt động.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer Navigation */}
      <nav className="bg-white border-t border-slate-200 p-2 flex items-center justify-around sticky bottom-0">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            activeTab === 'dashboard' ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab("groups")}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            activeTab === 'groups' ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Users size={20} />
          <span className="text-[9px] font-bold">Nhóm</span>
        </button>
        <button 
          onClick={() => setActiveTab("insights")}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            activeTab === 'insights' ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Lightbulb size={20} />
          <span className="text-[9px] font-bold">Insight</span>
        </button>
        <button 
          onClick={() => setActiveTab("friends")}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            activeTab === 'friends' ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <User size={20} />
          <span className="text-[9px] font-bold">Bạn bè</span>
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-400 hover:text-slate-600"
        >
          <Settings size={20} />
          <span className="text-[9px] font-bold">Cài đặt</span>
        </button>
      </nav>

      {/* --- Modals --- */}

      {/* Post Editor Modal */}
      <AnimatePresence>
        {showPostEditor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white rounded-t-2xl p-6 shadow-2xl max-h-[90%] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PenLine size={20} className="text-blue-500" />
                  Tạo bài đăng AI (A/B Testing)
                </h2>
                <button onClick={() => setShowPostEditor(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Loại hình</label>
                    <input 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={postData.type}
                      onChange={e => setPostData({...postData, type: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mục tiêu</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={postData.goal}
                      onChange={e => setPostData({...postData, goal: e.target.value as any})}
                    >
                      <option value="find_buyer">Tìm khách mua</option>
                      <option value="find_tenant">Tìm khách thuê</option>
                      <option value="news">Tin tức/Dự án</option>
                      <option value="urgent">Bán gấp</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vị trí & Đặc điểm (Chủ đề rộng)</label>
                  <textarea 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 h-24 resize-none"
                    value={postData.location}
                    onChange={e => setPostData({...postData, location: e.target.value})}
                    placeholder="VD: Căn hộ cao cấp Quận 2, view sông Sài Gòn, tiện ích 5 sao, giá đầu tư cực tốt..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số phiên bản (A/B)</label>
                    <input 
                      type="number"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={postData.numVariations}
                      onChange={e => setPostData({...postData, numVariations: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Clock size={10} /> Lịch đăng
                    </label>
                    <input 
                      type="datetime-local"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleGeneratePost}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isGenerating ? "Đang tạo nội dung..." : `Tạo ${postData.numVariations} phiên bản AI`}
                </button>

                {aiVariations.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Kết quả A/B Testing (Có thể chỉnh sửa)</p>
                    {aiVariations.map((v, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative group">
                        <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">Bản {i+1}</span>
                        <textarea 
                          className="w-full text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-transparent border-none outline-none resize-none min-h-[100px]"
                          value={v}
                          onChange={(e) => {
                            const newVariations = [...aiVariations];
                            newVariations[i] = e.target.value;
                            setAiVariations(newVariations);
                          }}
                        />
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handlePostNow(v)}
                              className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Send size={12} /> Đăng ngay
                            </button>
                            <button 
                              onClick={() => handleSchedulePost(v)}
                              className="text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 flex items-center gap-1"
                            >
                              <Calendar size={12} /> Lên lịch
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(v);
                              showToast(`Đã copy Bản ${i+1}!`, "success");
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scheduledPosts.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500" />
                      Bài đăng đã lên lịch
                    </h3>
                    <div className="space-y-2">
                      {scheduledPosts.map((post) => (
                        <div key={post.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-700 truncate">{post.content}</p>
                            <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1">
                              <Clock size={10} /> {new Date(post.scheduledAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                              post.status === 'posted' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {post.status}
                            </span>
                            <button 
                              onClick={() => setScheduledPosts(prev => prev.filter(p => p.id !== post.id))}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white rounded-t-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={20} className="text-slate-400" />
                  Cấu hình Hệ thống
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Key size={14} />
                    Gemini API Key
                  </label>
                  <input 
                    type="password"
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                    placeholder="Nhập API Key của bạn..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Database size={14} />
                    Supabase URL
                  </label>
                  <input 
                    type="text"
                    value={settings.supabaseUrl}
                    onChange={(e) => setSettings({...settings, supabaseUrl: e.target.value})}
                    placeholder="https://xxx.supabase.co"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Shield size={14} />
                    Supabase Anon Key
                  </label>
                  <input 
                    type="password"
                    value={settings.supabaseKey}
                    onChange={(e) => setSettings({...settings, supabaseKey: e.target.value})}
                    placeholder="eyJhbG..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={handleSaveSettings}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Lưu cấu hình
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

const ActionButton = ({ icon, label, description, color, onClick }: { icon: React.ReactNode, label: string, description: string, color: string, onClick?: () => void }) => (
  <motion.button 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-center"
  >
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm", color)}>
      {icon}
    </div>
    <div>
      <h3 className="text-[11px] font-bold text-slate-800">{label}</h3>
      <p className="text-[9px] text-slate-500 line-clamp-1">{description}</p>
    </div>
  </motion.button>
);

export default Popup;
