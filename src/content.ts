/**
 * Content script to handle auto-filling and posting on Facebook
 */

// Lắng nghe tin nhắn từ background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "AUTO_FILL_POST") {
    const { content } = message;
    
    // Tìm trình soạn thảo bài đăng của Facebook
    // Lưu ý: Facebook thay đổi selector thường xuyên. Đây là các selector phổ biến.
    const findEditorAndFill = () => {
      // Thử tìm div có role="textbox" (thường là trình soạn thảo của FB)
      const editor = document.querySelector('div[role="textbox"]') as HTMLElement;
      
      if (editor) {
        editor.focus();
        
        // Cách 1: Sử dụng execCommand (đã cũ nhưng đôi khi vẫn hoạt động)
        document.execCommand('insertText', false, content);
        
        // Cách 2: Nếu execCommand không hoạt động, thử dispatch sự kiện input
        // editor.innerText = content;
        // editor.dispatchEvent(new Event('input', { bubbles: true }));

        console.log("AI Automation: Đã điền nội dung bài đăng.");
        
        // Thử tìm nút "Đăng" (Post)
        // Nút này thường có text là "Đăng" hoặc "Post" và role="button"
        setTimeout(() => {
          const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
          const postButton = buttons.find(btn => {
            const text = (btn as HTMLElement).innerText?.toLowerCase();
            return text === 'đăng' || text === 'post';
          }) as HTMLElement;

          if (postButton) {
            // postButton.click(); // Tự động nhấn nút Đăng (Cẩn thận: có thể gây spam nếu không kiểm soát)
            console.log("AI Automation: Đã tìm thấy nút Đăng. Bạn có thể nhấn Đăng thủ công hoặc bỏ comment code click().");
          }
        }, 1000);

        return true;
      }
      return false;
    };

    // Thử điền ngay lập tức hoặc đợi một chút nếu trang đang load
    if (!findEditorAndFill()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (findEditorAndFill() || attempts > 10) {
          clearInterval(interval);
        }
      }, 1000);
    }

    sendResponse({ success: true });
  }

  // Tham gia nhóm
  if (message.action === "CLICK_JOIN_GROUP") {
    const joinButton = Array.from(document.querySelectorAll('div[role="button"]'))
      .find(btn => {
        const text = (btn as HTMLElement).innerText?.toLowerCase();
        return text === 'tham gia nhóm' || text === 'join group';
      }) as HTMLElement;

    if (joinButton) {
      joinButton.click();
      console.log("AI Automation: Đã nhấn nút Tham gia nhóm.");
    }
  }

  // Kết bạn + Nhắn tin
  if (message.action === "EXECUTE_FRIEND_REQUEST") {
    const { name, message: friendMsg } = message;
    
    // 1. Nhấn nút Thêm bạn bè
    const addFriendBtn = Array.from(document.querySelectorAll('div[role="button"]'))
      .find(btn => {
        const text = (btn as HTMLElement).innerText?.toLowerCase();
        return text === 'thêm bạn bè' || text === 'add friend';
      }) as HTMLElement;

    if (addFriendBtn) {
      addFriendBtn.click();
      console.log(`AI Automation: Đã gửi lời mời kết bạn cho ${name}.`);
      
      // 2. Nhấn nút Nhắn tin (thường xuất hiện sau khi kết bạn hoặc có sẵn)
      setTimeout(() => {
        const messageBtn = Array.from(document.querySelectorAll('div[role="button"]'))
          .find(btn => {
            const text = (btn as HTMLElement).innerText?.toLowerCase();
            return text === 'nhắn tin' || text === 'message';
          }) as HTMLElement;

        if (messageBtn) {
          messageBtn.click();
          
          // 3. Điền tin nhắn vào khung chat (đợi khung chat mở)
          setTimeout(() => {
            const chatBox = document.querySelector('div[role="textbox"]') as HTMLElement;
            if (chatBox) {
              chatBox.focus();
              document.execCommand('insertText', false, friendMsg);
              
              // Nhấn Enter để gửi
              chatBox.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              }));
              console.log(`AI Automation: Đã gửi tin nhắn cho ${name}.`);
            }
          }, 3000);
        }
      }, 2000);
    }
  }

  // Tương tác bài viết mới nhất
  if (message.action === "AUTO_INTERACT") {
    const { comment } = message;
    
    // Tìm bài viết đầu tiên trên tường
    const firstPost = document.querySelector('div[role="article"]');
    if (firstPost) {
      // Nhấn Like
      const likeBtn = firstPost.querySelector('div[aria-label="Thích"], div[aria-label="Like"]') as HTMLElement;
      if (likeBtn) likeBtn.click();
      
      // Nhấn Comment
      const commentBtn = firstPost.querySelector('div[aria-label="Viết bình luận"], div[aria-label="Write a comment"]') as HTMLElement;
      if (commentBtn) {
        commentBtn.click();
        setTimeout(() => {
          const commentBox = document.activeElement as HTMLElement;
          if (commentBox) {
            document.execCommand('insertText', false, comment);
            commentBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }, 1000);
      }
    }
  }

  // Hủy kết bạn
  if (message.action === "UNFRIEND_USER") {
    const friendBtn = Array.from(document.querySelectorAll('div[role="button"]'))
      .find(btn => {
        const text = (btn as HTMLElement).innerText?.toLowerCase();
        return text === 'bạn bè' || text === 'friends';
      }) as HTMLElement;

    if (friendBtn) {
      friendBtn.click();
      setTimeout(() => {
        const unfriendBtn = Array.from(document.querySelectorAll('div[role="menuitem"]'))
          .find(btn => {
            const text = (btn as HTMLElement).innerText?.toLowerCase();
            return text === 'hủy kết bạn' || text === 'unfriend';
          }) as HTMLElement;

        if (unfriendBtn) {
          unfriendBtn.click();
          setTimeout(() => {
            const confirmBtn = Array.from(document.querySelectorAll('div[role="button"]'))
              .find(btn => {
                const text = (btn as HTMLElement).innerText?.toLowerCase();
                return text === 'xác nhận' || text === 'confirm';
              }) as HTMLElement;
            if (confirmBtn) confirmBtn.click();
          }, 1000);
        }
      }, 1000);
    }
  }

  return true;
});
