export interface TransactionChatMessage {
  id: string;
  requestId: string;
  senderId: string; // player email, subadmin username, agent ID, or main admin email
  senderName: string;
  senderRole: "player" | "subadmin" | "admin" | "agent" | "system";
  message: string;
  attachmentUrl?: string; // Base64 or image URL proof
  imageBase64?: string;   // Base64 image payload
  image?: string;         // Alias for image Base64
  timestamp: string;
  read?: boolean;
}

/**
 * Downscale and compress image base64 before storing or sending
 */
export function compressImageBase64(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image/") || dataUrl.length < 30000) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Safely set item in localStorage with automatic quota management & pruning
 */
export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`localStorage quota exceeded for key '${key}'. Performing storage cleanup...`);
    pruneLocalStorageQuota(key);
    
    try {
      localStorage.setItem(key, value);
    } catch (retryErr) {
      const trimmedVal = trimPayloadValue(key, value);
      try {
        localStorage.setItem(key, trimmedVal);
      } catch (finalErr) {
        emergencyPurgeOldKeys(key);
        try {
          localStorage.setItem(key, trimmedVal);
        } catch (catastrophicErr) {
          console.error(`Unable to save key '${key}' to localStorage due to quota limits.`);
        }
      }
    }
  }
}

/**
 * Prune old messages, redundant keys, and heavy items from localStorage
 */
function pruneLocalStorageQuota(currentKey?: string) {
  try {
    // 1. Remove redundant / obsolete duplicate keys
    localStorage.removeItem("p2p_chat_messages");
    localStorage.removeItem("casino_banking_requests_v2");
    localStorage.removeItem("casino_agents_v1");
    localStorage.removeItem("p2p_agents");

    // 2. Prune audit logs to last 20
    const rawAudit = localStorage.getItem("p2p_audit_logs_v1");
    if (rawAudit) {
      try {
        const logs = JSON.parse(rawAudit);
        if (Array.isArray(logs) && logs.length > 20) {
          localStorage.setItem("p2p_audit_logs_v1", JSON.stringify(logs.slice(0, 20)));
        }
      } catch (e) {}
    }

    // 3. Trim global P2P chat store to last 12 items and strip images from older items
    const rawGlobal = localStorage.getItem("casino_p2p_chat_messages_v1");
    if (rawGlobal) {
      try {
        let globalMsgs: any[] = JSON.parse(rawGlobal);
        if (Array.isArray(globalMsgs)) {
          globalMsgs = globalMsgs.slice(-12).map((m, idx, arr) => {
            if (idx < arr.length - 2 && m.attachmentUrl) {
              const clone = { ...m };
              delete clone.attachmentUrl;
              delete clone.imageBase64;
              delete clone.image;
              return clone;
            }
            return m;
          });
          localStorage.setItem("casino_p2p_chat_messages_v1", JSON.stringify(globalMsgs));
        }
      } catch (e) {}
    }

    // 4. Trim legacy chat messages
    const rawLegacy = localStorage.getItem("casino_chat_messages_v1");
    if (rawLegacy) {
      try {
        let legacyMsgs: any[] = JSON.parse(rawLegacy);
        if (Array.isArray(legacyMsgs)) {
          legacyMsgs = legacyMsgs.slice(-10).map((m) => {
            const clone = { ...m };
            delete clone.attachmentUrl;
            delete clone.imageBase64;
            delete clone.image;
            return clone;
          });
          localStorage.setItem("casino_chat_messages_v1", JSON.stringify(legacyMsgs));
        }
      } catch (e) {}
    }

    // 5. Clean up any transaction chat keys (`casino_tx_chat_*`)
    const txKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("casino_tx_chat_")) {
        txKeys.push(k);
      }
    }

    // If more than 6 tx chat keys exist, remove the oldest ones (except currentKey)
    if (txKeys.length > 6) {
      txKeys.forEach((k) => {
        if (k !== currentKey && txKeys.length > 6) {
          localStorage.removeItem(k);
        }
      });
    }

    // Trim remaining tx chat keys to max 12 items and strip old images
    txKeys.forEach((k) => {
      const itemVal = localStorage.getItem(k);
      if (itemVal) {
        try {
          let txMsgs: any[] = JSON.parse(itemVal);
          if (Array.isArray(txMsgs)) {
            txMsgs = txMsgs.slice(-12).map((m, idx, arr) => {
              if (idx < arr.length - 2 && m.attachmentUrl) {
                const clone = { ...m };
                delete clone.attachmentUrl;
                delete clone.imageBase64;
                delete clone.image;
                return clone;
              }
              return m;
            });
            localStorage.setItem(k, JSON.stringify(txMsgs));
          }
        } catch (e) {}
      }
    });
  } catch (e) {
    console.warn("Error during localStorage quota pruning:", e);
  }
}

/**
 * Trim payload string array when quota is tight
 */
function trimPayloadValue(key: string, rawVal: string): string {
  try {
    const parsed = JSON.parse(rawVal);
    if (Array.isArray(parsed)) {
      const trimmed = parsed.slice(-8).map((m, idx, arr) => {
        if (idx < arr.length - 1) {
          const clone = { ...m };
          delete clone.attachmentUrl;
          delete clone.imageBase64;
          delete clone.image;
          return clone;
        }
        return m;
      });
      return JSON.stringify(trimmed);
    }
  } catch (e) {}
  return rawVal;
}

/**
 * Emergency purge of older transaction chat keys if quota fails
 */
function emergencyPurgeOldKeys(currentKey: string) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("casino_tx_chat_") && k !== currentKey) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}

/**
 * Get all transaction chat messages for a specific request ID
 */
export function getTransactionChatMessages(requestId: string): TransactionChatMessage[] {
  if (!requestId) return [];
  try {
    const raw = localStorage.getItem(`casino_tx_chat_${requestId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => ({
          ...m,
          imageBase64: m.imageBase64 || m.attachmentUrl || m.image,
          image: m.image || m.attachmentUrl || m.imageBase64,
        }));
      }
    }

    // Fallback: search global P2P chat store by requestId or receiverId
    const globalRaw = localStorage.getItem("casino_p2p_chat_messages_v1") || localStorage.getItem("p2p_chat_messages");
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) {
        const matches = parsed.filter((m: any) => m.requestId === requestId || m.receiverId === requestId);
        if (matches.length > 0) {
          return matches.map((m: any) => ({
            ...m,
            imageBase64: m.imageBase64 || m.attachmentUrl || m.image,
            image: m.image || m.attachmentUrl || m.imageBase64,
          }));
        }
      }
    }
  } catch (err) {
    console.error("Error loading tx chat messages:", err);
  }
  return [];
}

/**
 * Get all P2P chat messages across all requests
 */
export function getAllP2PChatMessages(): TransactionChatMessage[] {
  try {
    const raw = localStorage.getItem("casino_p2p_chat_messages_v1") || localStorage.getItem("p2p_chat_messages");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => ({
          ...m,
          imageBase64: m.imageBase64 || m.attachmentUrl || m.image,
          image: m.image || m.attachmentUrl || m.imageBase64,
        }));
      }
    }
  } catch (err) {
    console.error("Error loading all P2P chat messages:", err);
  }
  return [];
}

/**
 * Send / Append a transaction chat message
 */
export function sendTransactionChatMessage(
  arg1: string | Omit<TransactionChatMessage, "id" | "timestamp">,
  senderPayload?: any,
  text?: string,
  imageBase64?: string
): TransactionChatMessage {
  let msgObj: Omit<TransactionChatMessage, "id" | "timestamp">;

  if (typeof arg1 === "string") {
    let sId = "unknown";
    let sName = "Player";
    let sRole: "player" | "subadmin" | "admin" | "agent" | "system" = "player";

    if (senderPayload) {
      if (typeof senderPayload === "string") {
        sId = senderPayload;
        sName = senderPayload;
      } else if (typeof senderPayload === "object") {
        sId = senderPayload.senderId || senderPayload.email || senderPayload.name || senderPayload.id || "unknown";
        sName = senderPayload.senderName || senderPayload.name || "Player";
        sRole = senderPayload.senderRole || senderPayload.role || "player";
      }
    }

    msgObj = {
      requestId: arg1,
      senderId: sId,
      senderName: sName,
      senderRole: sRole,
      message: text || "",
      attachmentUrl: imageBase64,
      imageBase64: imageBase64,
      image: imageBase64,
    };
  } else {
    msgObj = arg1;
  }

  const rawImg = msgObj.attachmentUrl || msgObj.imageBase64 || msgObj.image;

  const fullMsg: TransactionChatMessage = {
    ...msgObj,
    attachmentUrl: rawImg,
    imageBase64: rawImg,
    image: rawImg,
    id: "CHAT-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: msgObj.read ?? false,
  };

  // Create sanitized clone for JSON serialization to avoid duplicate image keys in JSON
  const cleanMsgForStorage: any = { ...fullMsg };
  delete cleanMsgForStorage.imageBase64;
  delete cleanMsgForStorage.image;

  try {
    // 1. Save to specific request storage array (cap at last 15 messages)
    const existingForReq = getTransactionChatMessages(fullMsg.requestId).map((m: any) => {
      const c = { ...m };
      delete c.imageBase64;
      delete c.image;
      return c;
    });
    existingForReq.push(cleanMsgForStorage);
    const cappedForReq = existingForReq.slice(-15);
    safeSetLocalStorage(`casino_tx_chat_${fullMsg.requestId}`, JSON.stringify(cappedForReq));

    // 2. Save to global P2P chat store for cross-tab / agent desk sync (cap at last 15, strip images for older items)
    const globalRaw = localStorage.getItem("casino_p2p_chat_messages_v1");
    let globalList: any[] = [];
    if (globalRaw) {
      try {
        globalList = JSON.parse(globalRaw);
      } catch (e) {
        globalList = [];
      }
    }
    if (!globalList.some((m: any) => m.id === fullMsg.id)) {
      globalList.push(cleanMsgForStorage);
    }
    const cappedGlobal = globalList.slice(-15).map((m: any, idx: number, arr: any[]) => {
      if (idx < arr.length - 2 && m.attachmentUrl) {
        const c = { ...m };
        delete c.attachmentUrl;
        delete c.imageBase64;
        delete c.image;
        return c;
      }
      return m;
    });
    safeSetLocalStorage("casino_p2p_chat_messages_v1", JSON.stringify(cappedGlobal));

    // 3. Sync to legacy casino_chat_messages_v1 store for backward compatibility (cap at last 10, no heavy images)
    const legacyRaw = localStorage.getItem("casino_chat_messages_v1");
    let legacyList: any[] = [];
    if (legacyRaw) {
      try { legacyList = JSON.parse(legacyRaw); } catch (e) { legacyList = []; }
    }
    legacyList.push({
      id: fullMsg.id,
      senderId: fullMsg.senderId,
      senderName: fullMsg.senderName,
      senderRole: fullMsg.senderRole === "subadmin" ? "system" : fullMsg.senderRole,
      receiverId: fullMsg.requestId,
      message: fullMsg.message,
      timestamp: fullMsg.timestamp,
      read: fullMsg.read || false,
    });
    const cappedLegacy = legacyList.slice(-10);
    safeSetLocalStorage("casino_chat_messages_v1", JSON.stringify(cappedLegacy));

    // 4. Dispatch events for real-time UI updates
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("p2p_chat_updated"));
    window.dispatchEvent(new Event("casino_tx_chat_updated"));
    window.dispatchEvent(new CustomEvent("p2p_chat_updated", { detail: { requestId: fullMsg.requestId, message: fullMsg } }));
    window.dispatchEvent(new CustomEvent("casino_tx_chat_updated", { detail: { requestId: fullMsg.requestId, message: fullMsg } }));
  } catch (err) {
    console.error("Error saving tx chat message:", err);
  }

  return fullMsg;
}

/**
 * Mark chat messages as read for a given request ID
 */
export function markChatMessagesAsRead(requestId: string, senderRoleToMark: "player" | "agent" | "subadmin" = "player"): void {
  if (!requestId) return;
  try {
    // Specific request storage
    const raw = localStorage.getItem(`casino_tx_chat_${requestId}`);
    if (raw) {
      const msgs: TransactionChatMessage[] = JSON.parse(raw);
      let updated = false;
      const newMsgs = msgs.map((m) => {
        if (m.senderRole === senderRoleToMark && !m.read) {
          updated = true;
          return { ...m, read: true };
        }
        return m;
      });
      if (updated) {
        safeSetLocalStorage(`casino_tx_chat_${requestId}`, JSON.stringify(newMsgs));
      }
    }

    // Global storage
    const globalRaw = localStorage.getItem("casino_p2p_chat_messages_v1");
    if (globalRaw) {
      const globalMsgs: TransactionChatMessage[] = JSON.parse(globalRaw);
      let gUpdated = false;
      const newGlobal = globalMsgs.map((m) => {
        if (m.requestId === requestId && m.senderRole === senderRoleToMark && !m.read) {
          gUpdated = true;
          return { ...m, read: true };
        }
        return m;
      });
      if (gUpdated) {
        safeSetLocalStorage("casino_p2p_chat_messages_v1", JSON.stringify(newGlobal));
      }
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("p2p_chat_updated"));
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
}

/**
 * Get unread chat count for a request ID
 */
export function getUnreadCountForRequest(requestId: string, senderRoleToCount: "player" | "agent" = "player"): number {
  if (!requestId) return 0;
  const msgs = getTransactionChatMessages(requestId);
  return msgs.filter((m) => m.senderRole === senderRoleToCount && !m.read).length;
}

/**
 * Add a system status message to the chat (e.g. "Sub-Admin Verified TXID", "Deposit Approved")
 */
export function addSystemTxChatMessage(requestId: string, text: string) {
  sendTransactionChatMessage({
    requestId,
    senderId: "system",
    senderName: "Casino System",
    senderRole: "system",
    message: text,
    read: true,
  });
}
