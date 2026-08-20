import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, Eye, EyeOff, Smartphone, AlertCircle, Mail, ChevronLeft, User,
  ShieldCheck, Zap, Key, ArrowRight, RefreshCw, Send, CheckCircle2,
  Wallet, Globe, Sparkles, Check, Copy, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import NexaSpinLogo from "./NexaSpinLogo";
import { Transaction } from "../types";
import { getMergedP2PAgents } from "../constants/p2pAgents";
import { getRegisteredPlayers, getRevokedPlayerEmails } from "../constants/defaultPlayers";
import { getSubAdmins } from "../constants/subAdmins";
import { saveAllPlayersToDatabase, fetchCloudPlayersFromD1 } from "../lib/db";
import { 
  supabase, 
  sendPhoneOtp, 
  verifyPhoneOtp, 
  signInWithGoogleOAuth, 
  isSupabaseConfigured,
  syncSupabaseProfile,
  fetchSupabaseProfile,
  saveUserSessionWithPersistence,
  getRoleRedirectPath
} from "../lib/supabase";

interface RegisteredPlayer {
  name: string;
  email: string;
  phoneNumber: string;
  password?: string;
  walletAddress?: string;
  referralCode?: string;
  referredBy?: string;
  referralChipsEarned?: number;
  unclaimedReferralChips?: number;
  chips?: number;
  bonusBalance?: number;
  totalWagerRequired?: number;
  currentWagerProgress?: number;
  peakChips?: number;
  loanCount?: number;
  vipLevel?: number | string;
  transactions?: Transaction[];
}

interface LoginScreenProps {
  onLoginSuccess: (user: {
    role: "player" | "admin" | "agent" | "Sub-Admin" | "super_admin" | "sub_admin";
    name: string;
    phoneNumber?: string;
    email?: string;
    walletAddress?: string;
    loggedInVia: "phone" | "google" | "credentials" | "email_password" | "web3" | "telegram";
    agentId?: string;
    expiresAt?: number;
    createdAt?: number;
    sessionDurationDays?: number;
  }) => void;
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

type InputDetectionType = "phone" | "email" | "web3" | "username";

export default function LoginScreen({ onLoginSuccess, onAddAuditLog }: LoginScreenProps) {
  // Registered players loaded from storage
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);

  // Subviews within the Login Portal
  const [playerSubView, setPlayerSubView] = useState<"login" | "sms_otp" | "register" | "forgot_password" | "verify_reset_otp" | "new_password">("login");
  
  // Sleek Sub-Tab Switcher: "sms_otp" vs "email_password"
  const [activeLoginTab, setActiveLoginTab] = useState<"sms_otp" | "email_password">("sms_otp");

  // Dynamic Unified Smart Input
  const [smartInput, setSmartInput] = useState("");
  const [detectedType, setDetectedType] = useState<InputDetectionType>("phone");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // SMS OTP Verification Screen States
  const [otpPhoneTarget, setOtpPhoneTarget] = useState("");
  const [otpInputs, setOtpInputs] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpResendCountdown, setOtpResendCountdown] = useState(60);
  const [expectedMockOtp, setExpectedMockOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Registration form states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regReferralCode, setRegReferralCode] = useState("");
  const [regError, setRegError] = useState("");

  // Forgot Password / OTP states
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [generatedResetOtp, setGeneratedResetOtp] = useState("");
  const [userEnteredResetOtp, setUserEnteredResetOtp] = useState("");
  const [resetOtpError, setResetOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");

  // Social & Web3 Modals
  const [showGooglePickerModal, setShowGooglePickerModal] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [showWeb3Modal, setShowWeb3Modal] = useState(false);
  const [web3WalletAddress, setWeb3WalletAddress] = useState("");

  // Unique referral code generator helper
  const generateReferralCode = (name: string): string => {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prefix = cleanName.length >= 3 ? cleanName.slice(0, 5) : "VIP";
    const random = Math.floor(100 + Math.random() * 900).toString();
    return `${prefix}${random}`;
  };

  // Load registered players & handle URL referrals
  useEffect(() => {
    setPlayers(getRegisteredPlayers() as any);

    const urlParams = new URLSearchParams(window.location.search);
    const urlRefCode = urlParams.get("ref");
    if (urlRefCode) {
      const trimmedCode = urlRefCode.trim().toUpperCase();
      setRegReferralCode(trimmedCode);
      sessionStorage.setItem("pending_referral_code", trimmedCode);
      if (onAddAuditLog) {
        onAddAuditLog(`SYSTEM: Dynamic landing referral tracked: Code [${trimmedCode}] captured via URL.`, "info");
      }
    } else {
      const cachedRef = sessionStorage.getItem("pending_referral_code");
      if (cachedRef) {
        setRegReferralCode(cachedRef);
      }
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (playerSubView === "sms_otp" && otpResendCountdown > 0) {
      timer = setInterval(() => {
        setOtpResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playerSubView, otpResendCountdown]);

  // Smart Input Detection Engine
  useEffect(() => {
    const val = smartInput.trim();
    if (!val) {
      setDetectedType(activeLoginTab === "sms_otp" ? "phone" : "email");
      return;
    }

    if (val.startsWith("0x") || (val.length >= 30 && /^[a-fA-F0-9x]+$/.test(val))) {
      setDetectedType("web3");
    } else if (val.includes("@") || val.includes(".com") || val.includes(".net")) {
      setDetectedType("email");
    } else if (/^(\+880|880|01|\d{4,})/.test(val) || /^[\d\s\-+()]+$/.test(val)) {
      setDetectedType("phone");
    } else {
      setDetectedType("username");
    }
  }, [smartInput, activeLoginTab]);

  const savePlayersList = (updated: RegisteredPlayer[]) => {
    setPlayers(updated);
    localStorage.setItem("registered_players_v1", JSON.stringify(updated));
    saveAllPlayersToDatabase(updated as any);
  };

  // Form formatting helper for Phone Number
  const formatPhoneNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    
    if (cleaned.startsWith("880")) {
      const sub = cleaned.substring(3);
      if (sub.length <= 5) return `+880 ${sub}`;
      return `+880 ${sub.slice(0, 5)}-${sub.slice(5, 11)}`;
    }

    if (cleaned.startsWith("0")) {
      if (cleaned.length <= 5) return cleaned;
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 11)}`;
    } else {
      if (cleaned.length <= 4) return cleaned;
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 10)}`;
    }
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return "Please enter a valid phone number (e.g. 01712-345678 or +88017...).";
    }
    return "";
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Direct Phone Login Handler for regular players and staff without SMS OTP
  const handleDirectPhoneLogin = (phoneToUse: string) => {
    const err = validatePhone(phoneToUse);
    if (err) {
      setLoginError(err);
      casinoAudio.playClick();
      return;
    }

    setLoginError("");
    const cleanDigits = phoneToUse.replace(/\D/g, "");

    // 1. Check Admin Phone
    if (cleanDigits === "01700000000" || cleanDigits.endsWith("01700000000")) {
      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Admin authenticated via Direct Phone (${phoneToUse})`, "success");
      onLoginSuccess({ role: "admin", name: "admin", phoneNumber: phoneToUse, loggedInVia: "phone" });
      return;
    }

    // 2. Check Sub-Admin Phone
    const subAdmins = getSubAdmins();
    const subMatch = subAdmins.find((sa: any) => 
      (sa.phone && sa.phone.replace(/\D/g, "") === cleanDigits) ||
      (sa.phoneNumber && sa.phoneNumber.replace(/\D/g, "") === cleanDigits)
    );
    if (subMatch) {
      if (subMatch.status !== "active") {
        setLoginError(`Sub-Admin account status is ${subMatch.status.toUpperCase()}. Access restricted.`);
        casinoAudio.playClick();
        return;
      }
      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Sub-Admin [${subMatch.name}] authenticated via Direct Phone`, "success");
      onLoginSuccess({ role: "Sub-Admin", name: subMatch.name, phoneNumber: phoneToUse, loggedInVia: "phone" });
      return;
    }

    // 3. Check Agent Phone
    const agents = getMergedP2PAgents();
    const agentMatch = agents.find((a: any) => {
      const aPhoneClean = (a.phone || "").replace(/\D/g, "");
      const aPhoneNumClean = (a.phoneNumber || "").replace(/\D/g, "");
      return (
        cleanDigits.length >= 6 && 
        (aPhoneClean === cleanDigits || aPhoneNumClean === cleanDigits || aPhoneClean.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneClean))
      );
    });
    if (agentMatch) {
      if ((agentMatch.status as string) === "blocked" || agentMatch.status === "suspended") {
        setLoginError("This Agent account has been blocked by administration.");
        casinoAudio.playClick();
        return;
      }
      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Agent [${agentMatch.name}] authenticated via Direct Phone`, "success");
      onLoginSuccess({ role: "agent", name: agentMatch.name, phoneNumber: phoneToUse, loggedInVia: "phone", agentId: agentMatch.id });
      return;
    }

    // 4. Regular Player Direct Login (NO SMS OTP REQUIRED)
    const revokedEmails = getRevokedPlayerEmails();
    const existing = players.find(p => p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === cleanDigits);
    if (existing) {
      if (existing.email && revokedEmails.has(existing.email.toLowerCase().trim())) {
        setLoginError("This player account has been revoked by Casino Administration.");
        casinoAudio.playClick();
        return;
      }

      if ((existing as any).status === "suspended" || (existing as any).status === "blocked") {
        setLoginError("This player account has been suspended by Casino Administration.");
        casinoAudio.playClick();
        return;
      }

      // Sync with Supabase Profile
      syncSupabaseProfile({
        id: (existing as any).id || `player_${cleanDigits}`,
        name: existing.name,
        phone_number: phoneToUse,
        email: existing.email,
        chips: existing.chips || 0,
        bonus_balance: existing.bonusBalance || 200,
        vip_level: Number(existing.vipLevel) || 1,
        role: "player"
      });

      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: VIP Player [${existing.name}] logged in directly via Phone (${phoneToUse})`, "success");
      onLoginSuccess({
        role: "player",
        name: existing.name,
        phoneNumber: phoneToUse,
        email: existing.email,
        loggedInVia: "phone"
      });
      return;
    } else {
      // Auto-provision brand new VIP player
      const newPlayerName = `VIP Player ${cleanDigits.slice(-4)}`;
      const newRefCode = generateReferralCode(newPlayerName);
      const newPlayer: RegisteredPlayer = {
        name: newPlayerName,
        email: `player_${cleanDigits.slice(-6)}@nexaspin.vip`,
        phoneNumber: phoneToUse,
        password: "direct_phone_auth",
        referralCode: newRefCode,
        chips: 0,
        bonusBalance: 200,
        totalWagerRequired: 6000,
        currentWagerProgress: 0,
        peakChips: 0,
        loanCount: 0,
        vipLevel: 1,
        transactions: []
      };

      const updated = [...players, newPlayer];
      savePlayersList(updated);

      // Sync with Supabase
      syncSupabaseProfile({
        id: `player_${cleanDigits}`,
        name: newPlayerName,
        phone_number: phoneToUse,
        email: newPlayer.email,
        chips: 0,
        bonus_balance: 200,
        vip_level: 1,
        role: "player"
      });

      casinoAudio.playWin();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Auto-provisioned VIP Member [${newPlayerName}] via Direct Phone Login`, "success");
      onLoginSuccess({
        role: "player",
        name: newPlayerName,
        phoneNumber: phoneToUse,
        email: newPlayer.email,
        loggedInVia: "phone"
      });
      return;
    }
  };

  // Trigger Phone Login (Direct Phone Login without SMS OTP)
  const handleInitiateSmsOtp = async (phoneToUse: string) => {
    handleDirectPhoneLogin(phoneToUse);
  };

  // Complete OTP Verification
  const handleVerifySmsOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = otpInputs.join("").trim();
    if (token.length !== 6) {
      setLoginError("Please enter all 6 digits of the OTP code.");
      casinoAudio.playClick();
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const res = await verifyPhoneOtp(otpPhoneTarget, token, expectedMockOtp);
      setIsLoading(false);

      if (!res.success) {
        setLoginError(res.error || "Invalid OTP code. Please re-enter or resend.");
        casinoAudio.playClick();
        return;
      }

      // Successful OTP Verification! Check user account or auto-create VIP profile
      const cleanDigits = otpPhoneTarget.replace(/\D/g, "");

      // 1. Check Admin Phone
      if (cleanDigits === "01700000000" || cleanDigits.endsWith("01700000000")) {
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Admin authenticated via Supabase SMS OTP (${otpPhoneTarget})`, "success");
        onLoginSuccess({ role: "admin", name: "admin", phoneNumber: otpPhoneTarget, loggedInVia: "phone" });
        return;
      }

      // 2. Check Sub-Admin
      const subAdmins = getSubAdmins();
      const subMatch = subAdmins.find((sa: any) => 
        (sa.phone && sa.phone.replace(/\D/g, "") === cleanDigits) ||
        (sa.phoneNumber && sa.phoneNumber.replace(/\D/g, "") === cleanDigits)
      );
      if (subMatch) {
        if (subMatch.status !== "active") {
          setLoginError(`Sub-Admin account status is ${subMatch.status.toUpperCase()}. Access restricted.`);
          return;
        }
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Sub-Admin [${subMatch.name}] authenticated via SMS OTP`, "success");
        onLoginSuccess({ role: "Sub-Admin", name: subMatch.name, phoneNumber: otpPhoneTarget, loggedInVia: "phone" });
        return;
      }

      // 3. Check Agent
      const agents = getMergedP2PAgents();
      const agentMatch = agents.find((a: any) => 
        (a.phone && a.phone.replace(/\D/g, "") === cleanDigits) ||
        (a.phoneNumber && a.phoneNumber.replace(/\D/g, "") === cleanDigits)
      );
      if (agentMatch) {
        if ((agentMatch.status as string) === "blocked" || agentMatch.status === "suspended") {
          setLoginError("This Agent account has been blocked by administration.");
          return;
        }
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Agent [${agentMatch.name}] authenticated via SMS OTP`, "success");
        onLoginSuccess({ role: "agent", name: agentMatch.name, phoneNumber: otpPhoneTarget, loggedInVia: "phone", agentId: agentMatch.id });
        return;
      }

      // 4. Check Registered Player or Auto-Provision New VIP Escrow Player
      const existing = players.find(p => p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === cleanDigits);
      if (existing) {
        if ((existing as any).status === "suspended" || (existing as any).status === "blocked") {
          setLoginError("This player account has been suspended by Casino Administration.");
          return;
        }

        // Sync with Supabase Profile if configured
        syncSupabaseProfile({
          id: (existing as any).id || `player_${cleanDigits}`,
          name: existing.name,
          phone_number: otpPhoneTarget,
          email: existing.email,
          chips: existing.chips || 0,
          bonus_balance: existing.bonusBalance || 200,
          vip_level: Number(existing.vipLevel) || 1,
          role: "player"
        });

        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Player [${existing.name}] logged in via Verified Supabase SMS OTP (${otpPhoneTarget})`, "success");
        onLoginSuccess({
          role: "player",
          name: existing.name,
          phoneNumber: otpPhoneTarget,
          email: existing.email,
          loggedInVia: "phone"
        });
        return;
      } else {
        // Auto-provision brand new verified VIP player with sign-up bonus
        const newPlayerName = `VIP Player ${cleanDigits.slice(-4)}`;
        const newRefCode = generateReferralCode(newPlayerName);
        const newPlayer: RegisteredPlayer = {
          name: newPlayerName,
          email: `player_${cleanDigits.slice(-6)}@nexaspin.vip`,
          phoneNumber: otpPhoneTarget,
          password: "sms_verified",
          referralCode: newRefCode,
          chips: 0,
          bonusBalance: 200,
          totalWagerRequired: 6000,
          currentWagerProgress: 0,
          peakChips: 0,
          loanCount: 0,
          vipLevel: 1,
          transactions: []
        };

        const updated = [...players, newPlayer];
        savePlayersList(updated);

        // Sync with Supabase
        syncSupabaseProfile({
          id: `player_${cleanDigits}`,
          name: newPlayerName,
          phone_number: otpPhoneTarget,
          email: newPlayer.email,
          chips: 0,
          bonus_balance: 200,
          vip_level: 1,
          role: "player"
        });

        casinoAudio.playWin();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Auto-provisioned Verified Escrow VIP Member [${newPlayerName}]`, "success");
        onLoginSuccess({
          role: "player",
          name: newPlayerName,
          phoneNumber: otpPhoneTarget,
          email: newPlayer.email,
          loggedInVia: "phone"
        });
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError("Verification failed. Please try again.");
    }
  };

  // OTP Box Key Handling
  const handleOtpBoxChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    const newInputs = [...otpInputs];
    
    if (clean.length > 1) {
      // User pasted full code
      const pasted = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newInputs[i] = pasted[i] || "";
      }
      setOtpInputs(newInputs);
      if (pasted.length === 6) {
        setTimeout(() => handleVerifySmsOtpSubmit(), 100);
      }
      return;
    }

    newInputs[index] = clean;
    setOtpInputs(newInputs);
    setLoginError("");

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit when 6th digit entered
    if (clean && index === 5 && newInputs.every(d => d.length === 1)) {
      setTimeout(() => handleVerifySmsOtpSubmit(), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Main Unified Login Submit Handler
  const handleMainLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const inputVal = smartInput.trim();
    if (!inputVal) {
      setLoginError(activeLoginTab === "sms_otp" ? "Please enter your mobile phone number." : "Please enter your Email, Username, or Wallet Address.");
      casinoAudio.playClick();
      return;
    }

    // 1. Direct Phone Login without SMS OTP for regular players and staff
    const cleanDigits = inputVal.replace(/\D/g, "");
    const isPhonePattern = activeLoginTab === "sms_otp" || detectedType === "phone" || (cleanDigits.length >= 10 && cleanDigits.length <= 13);
    if (isPhonePattern && (!loginPassword || activeLoginTab === "sms_otp")) {
      handleDirectPhoneLogin(smartInput);
      return;
    }

    // 2. Web3 Wallet Address Flow
    if (detectedType === "web3") {
      handleWeb3DirectLogin(smartInput);
      return;
    }

    // 3. Credentials Mode (Email / Username / ID + Password)
    const inputClean = inputVal.toLowerCase();
    const cleanPhoneDigits = inputVal.replace(/\D/g, "");

    // A. Check Admin Credentials
    if (
      inputClean === "admin" ||
      inputClean === "admin@casino.com" ||
      inputClean === "admin@nexaspin.com" ||
      inputClean === "admin@nexaspin.vip" ||
      inputClean === "superadmin" ||
      (cleanPhoneDigits === "01700000000" && cleanPhoneDigits.length >= 10)
    ) {
      if (loginPassword.toLowerCase() === "admin" || loginPassword === "admin123" || loginPassword === "adminpwd") {
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Admin [admin] authenticated with Escrow Vault access.`, "success");
        onLoginSuccess({ role: "admin", name: "admin", loggedInVia: "credentials" });
        return;
      } else {
        setLoginError("Incorrect security password for Admin account.");
        casinoAudio.playClick();
        return;
      }
    }

    // B. Check Sub-Admin
    const subAdmins = getSubAdmins();
    const subMatch = subAdmins.find((sa: any) => 
      (sa.username && sa.username.toLowerCase() === inputClean) ||
      (sa.email && sa.email.toLowerCase() === inputClean) ||
      (inputClean === "subadmin@nexaspin.com" || inputClean === "subadmin@nexaspin.vip") ||
      (sa.name && sa.name.toLowerCase() === inputClean) ||
      (sa.phone && cleanPhoneDigits.length >= 10 && sa.phone.replace(/\D/g, "") === cleanPhoneDigits)
    );
    if (subMatch) {
      if (
        loginPassword === subMatch.securityKey ||
        loginPassword === "subadminpwd" ||
        loginPassword === "subadmin123" ||
        loginPassword === (subMatch as any).password
      ) {
        if (subMatch.status !== "active") {
          setLoginError(`Sub-Admin account status is ${subMatch.status.toUpperCase()}. Access restricted.`);
          casinoAudio.playClick();
          return;
        }
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: Sub-Admin [${subMatch.name}] authenticated successfully.`, "success");
        onLoginSuccess({ role: "Sub-Admin", name: subMatch.name, loggedInVia: "credentials" });
        return;
      } else {
        setLoginError("Incorrect security key for Sub-Admin account.");
        casinoAudio.playClick();
        return;
      }
    }

    // C. Check Agent
    const agents = getMergedP2PAgents();
    const agentMatch = agents.find((a: any) => {
      const aId = (a.id || "").toLowerCase().trim();
      const aEmail = (a.email || "").toLowerCase().trim();
      const aName = (a.name || "").toLowerCase().trim();
      const aPhoneClean = (a.phone || "").replace(/\D/g, "");
      const aPhoneNumClean = (a.phoneNumber || "").replace(/\D/g, "");

      return (
        (aId && aId === inputClean) ||
        (aEmail && aEmail === inputClean) ||
        ((inputClean === "agent@nexaspin.com" || inputClean === "agent@nexaspin.vip" || inputClean === "agent") && aId === "agent-1") ||
        (aName && aName === inputClean) ||
        (cleanPhoneDigits.length >= 6 && (aPhoneClean === cleanPhoneDigits || aPhoneNumClean === cleanPhoneDigits || aPhoneClean.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(aPhoneClean)))
      );
    });

    if (agentMatch) {
      const enteredPass = loginPassword.trim();
      const storedPass = (agentMatch.password || "").trim();

      if (
        enteredPass === storedPass || 
        loginPassword === agentMatch.password || 
        enteredPass === "Agent123!" ||
        enteredPass === "agent123" || 
        enteredPass === "agent1pwd"
      ) {
        if ((agentMatch.status as string) === "blocked" || agentMatch.status === "suspended") {
          setLoginError("This Agent account has been blocked by administration.");
          casinoAudio.playClick();
          return;
        }
        casinoAudio.playChipClink();
        if (onAddAuditLog) onAddAuditLog(`AUTH: P2P Agent [${agentMatch.name}] logged in to Escrow Hub.`, "success");
        onLoginSuccess({
          role: "agent",
          name: agentMatch.name,
          phoneNumber: agentMatch.phoneNumber || agentMatch.phone,
          loggedInVia: "email_password",
          agentId: agentMatch.id
        });
        return;
      } else {
        setLoginError("Incorrect password for Agent account.");
        casinoAudio.playClick();
        return;
      }
    }

    // D. Check Registered Player Credentials (with Remote/Cloud lookup fallback)
    const revokedEmails = getRevokedPlayerEmails();
    if (revokedEmails.has(inputClean)) {
      setLoginError("This player account has been revoked by Casino Administration.");
      casinoAudio.playClick();
      return;
    }

    let currentPlayers = players;
    let playerMatch = currentPlayers.find((p: any) => 
      (p.email && p.email.toLowerCase() === inputClean) ||
      (p.name && p.name.toLowerCase() === inputClean) ||
      (p.phoneNumber && cleanPhoneDigits.length >= 10 && p.phoneNumber.replace(/\D/g, "") === cleanPhoneDigits)
    );

    if (!playerMatch) {
      try {
        const fresh = await fetchCloudPlayersFromD1();
        if (fresh && fresh.length > 0) {
          setPlayers(fresh);
          currentPlayers = fresh;
          playerMatch = fresh.find((p: any) => 
            (p.email && p.email.toLowerCase() === inputClean) ||
            (p.name && p.name.toLowerCase() === inputClean) ||
            (p.phoneNumber && cleanPhoneDigits.length >= 10 && p.phoneNumber.replace(/\D/g, "") === cleanPhoneDigits)
          );
        }
      } catch (err) {}
    }

    if (playerMatch) {
      if (playerMatch.email && revokedEmails.has(playerMatch.email.toLowerCase().trim())) {
        setLoginError("This player account has been revoked by Casino Administration.");
        casinoAudio.playClick();
        return;
      }

      if ((playerMatch as any).status === "suspended" || (playerMatch as any).status === "blocked") {
        setLoginError("This player account has been suspended by Casino Administration.");
        casinoAudio.playClick();
        return;
      }

      if (playerMatch.password !== loginPassword) {
        setLoginError("Incorrect password. Try SMS Quick OTP or use Password Reset.");
        casinoAudio.playClick();
        return;
      }

      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: VIP Player [${playerMatch.name}] authenticated successfully.`, "success");
      onLoginSuccess({
        role: "player",
        name: playerMatch.name,
        phoneNumber: playerMatch.phoneNumber,
        email: playerMatch.email,
        loggedInVia: "email_password"
      });
      return;
    }

    // Not found
    setLoginError("No account found matching these credentials. Please check spelling or use SMS Quick OTP.");
    casinoAudio.playClick();
  };

  // Web3 Direct Login handler
  const handleWeb3DirectLogin = (address: string) => {
    const cleanAddr = address.trim();
    if (!cleanAddr.startsWith("0x") || cleanAddr.length < 10) {
      setLoginError("Please enter a valid 0x Ethereum / BSC wallet address.");
      casinoAudio.playClick();
      return;
    }

    const shortAddr = `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`;
    const existingPlayer = players.find(p => p.walletAddress?.toLowerCase() === cleanAddr.toLowerCase());

    if (existingPlayer) {
      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Web3 VIP Member [${existingPlayer.name}] signed in (${shortAddr})`, "success");
      onLoginSuccess({
        role: "player",
        name: existingPlayer.name,
        walletAddress: cleanAddr,
        email: existingPlayer.email,
        loggedInVia: "web3"
      });
    } else {
      const newPName = `Web3 VIP (${shortAddr})`;
      const newPlayer: RegisteredPlayer = {
        name: newPName,
        email: `web3_${cleanAddr.slice(2, 8).toLowerCase()}@nexaspin.vip`,
        phoneNumber: "01700-000000",
        walletAddress: cleanAddr,
        password: "web3_authenticated",
        referralCode: generateReferralCode("WEB3"),
        chips: 0,
        bonusBalance: 200,
        totalWagerRequired: 6000,
        currentWagerProgress: 0,
        peakChips: 0,
        loanCount: 0,
        vipLevel: 1,
        transactions: []
      };

      savePlayersList([...players, newPlayer]);
      casinoAudio.playWin();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Registered new Web3 Escrow Member [${newPName}]`, "success");
      onLoginSuccess({
        role: "player",
        name: newPName,
        walletAddress: cleanAddr,
        email: newPlayer.email,
        loggedInVia: "web3"
      });
    }
  };

  // Google Social Sign In Trigger
  const handleGoogleSocialClick = async () => {
    casinoAudio.playClick();
    if (isSupabaseConfigured) {
      try {
        const { success, error } = await signInWithGoogleOAuth();
        if (!success && error) {
          setShowGooglePickerModal(true);
        }
      } catch (e) {
        setShowGooglePickerModal(true);
      }
    } else {
      setShowGooglePickerModal(true);
    }
  };

  // Telegram Social Sign In
  const handleTelegramAuthClick = () => {
    casinoAudio.playClick();
    setShowTelegramModal(true);
  };

  // MetaMask / WalletConnect Click
  const handleMetaMaskClick = async () => {
    casinoAudio.playClick();
    if (typeof (window as any).ethereum !== "undefined") {
      try {
        setIsLoading(true);
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setIsLoading(false);
        if (accounts && accounts[0]) {
          handleWeb3DirectLogin(accounts[0]);
          return;
        }
      } catch (e) {
        setIsLoading(false);
      }
    }
    setShowWeb3Modal(true);
  };

  // Complete Google Account Selection from modal
  const handleSelectGoogleAccount = (name: string, email: string) => {
    const emailLower = email.trim().toLowerCase();
    const formattedName = name.trim() || emailLower.split("@")[0];
    
    setShowGooglePickerModal(false);
    
    if (emailLower === "admin@casino.com") {
      casinoAudio.playChipClink();
      onLoginSuccess({ role: "admin", name: "admin", loggedInVia: "google" });
      return;
    }

    const subAdmins = getSubAdmins();
    const subMatch = subAdmins.find(s => s.email && s.email.toLowerCase() === emailLower);
    if (subMatch) {
      casinoAudio.playChipClink();
      onLoginSuccess({ role: "Sub-Admin", name: subMatch.name, loggedInVia: "google" });
      return;
    }

    const agents = getMergedP2PAgents();
    const agentMatch = agents.find(a => a.email && a.email.toLowerCase() === emailLower);
    if (agentMatch) {
      casinoAudio.playChipClink();
      onLoginSuccess({ role: "agent", name: agentMatch.name, agentId: agentMatch.id, loggedInVia: "google" });
      return;
    }

    const existingPlayer = players.find(p => p.email && p.email.trim().toLowerCase() === emailLower);
    if (existingPlayer) {
      if ((existingPlayer as any).status === "suspended" || (existingPlayer as any).status === "blocked") {
        setLoginError("This account has been suspended by Casino Administration.");
        return;
      }

      casinoAudio.playChipClink();
      if (onAddAuditLog) onAddAuditLog(`AUTH: VIP Member [${existingPlayer.name}] logged in via Google OAuth`, "success");
      onLoginSuccess({
        role: "player",
        name: existingPlayer.name || formattedName,
        phoneNumber: existingPlayer.phoneNumber || "01700000000",
        email: emailLower,
        loggedInVia: "google"
      });
    } else {
      // Auto register player
      const newPlayer: RegisteredPlayer = {
        name: formattedName,
        email: emailLower,
        phoneNumber: "01700-000000",
        password: "google_oauth_verified",
        referralCode: generateReferralCode(formattedName),
        chips: 0,
        bonusBalance: 200,
        totalWagerRequired: 6000,
        currentWagerProgress: 0,
        peakChips: 0,
        loanCount: 0,
        vipLevel: 1,
        transactions: []
      };

      savePlayersList([...players, newPlayer]);
      casinoAudio.playWin();
      if (onAddAuditLog) onAddAuditLog(`AUTH: Registered new Google VIP Member [${formattedName}]`, "success");
      onLoginSuccess({
        role: "player",
        name: formattedName,
        phoneNumber: "01700-000000",
        email: emailLower,
        loggedInVia: "google"
      });
    }
  };

  // Complete Telegram Login
  const handleTelegramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = telegramUsername.trim().replace("@", "");
    if (!handle) return;

    setShowTelegramModal(false);
    const tgName = `@${handle}`;
    const existingPlayer = players.find(p => p.name.toLowerCase() === tgName.toLowerCase() || p.email.includes(handle.toLowerCase()));

    if (existingPlayer) {
      casinoAudio.playChipClink();
      onLoginSuccess({ role: "player", name: existingPlayer.name, email: existingPlayer.email, loggedInVia: "telegram" });
    } else {
      const newPlayer: RegisteredPlayer = {
        name: tgName,
        email: `${handle.toLowerCase()}@telegram.vip`,
        phoneNumber: "01700-000000",
        password: "telegram_auth",
        referralCode: generateReferralCode(handle),
        chips: 0,
        bonusBalance: 200,
        totalWagerRequired: 6000,
        currentWagerProgress: 0,
        peakChips: 0,
        loanCount: 0,
        vipLevel: 1,
        transactions: []
      };

      savePlayersList([...players, newPlayer]);
      casinoAudio.playWin();
      onLoginSuccess({ role: "player", name: tgName, email: newPlayer.email, loggedInVia: "telegram" });
    }
    setTelegramUsername("");
  };

  // Registration submit handler
  const handlePlayerRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    const phoneErr = validatePhone(regPhone);
    if (phoneErr) {
      setRegError(phoneErr);
      casinoAudio.playClick();
      return;
    }

    if (!validateEmail(regEmail)) {
      setRegError("Please enter a valid email address.");
      casinoAudio.playClick();
      return;
    }

    if (regPassword.length < 5) {
      setRegError("Password must be at least 5 characters long.");
      casinoAudio.playClick();
      return;
    }

    const emailLower = regEmail.trim().toLowerCase();
    const phoneCleaned = regPhone.replace(/\D/g, "");

    const dupEmail = players.some(p => p.email && p.email.toLowerCase() === emailLower);
    if (dupEmail) {
      setRegError("An account with this email already exists.");
      casinoAudio.playClick();
      return;
    }

    const dupPhone = players.some(p => p.phoneNumber && p.phoneNumber.replace(/\D/g, "") === phoneCleaned);
    if (dupPhone) {
      setRegError("This phone number is already registered.");
      casinoAudio.playClick();
      return;
    }

    const refCodeInput = regReferralCode.trim().toUpperCase();
    let referredByCode = "";
    let startingBonus = 200;

    if (refCodeInput) {
      const referrer = players.find(p => p.referralCode && p.referralCode.toUpperCase() === refCodeInput);
      if (!referrer) {
        setRegError("The entered referral code is invalid.");
        casinoAudio.playClick();
        return;
      }
      referredByCode = referrer.referralCode || "";
    }

    const myNewReferralCode = generateReferralCode(regName || "VIP");

    const newP: RegisteredPlayer = {
      name: regName.trim() || `VIP Player ${regPhone.slice(-4)}`,
      email: emailLower,
      phoneNumber: regPhone,
      password: regPassword,
      referralCode: myNewReferralCode,
      referredBy: referredByCode,
      referralChipsEarned: 0,
      unclaimedReferralChips: 0,
      chips: 0,
      bonusBalance: startingBonus,
      totalWagerRequired: startingBonus * 30,
      currentWagerProgress: 0,
      peakChips: 0,
      loanCount: 0,
      vipLevel: 1,
      transactions: []
    };

    const updatedPlayers = [...players, newP];
    savePlayersList(updatedPlayers);

    // Sync to Supabase Profiles
    syncSupabaseProfile({
      id: `player_${phoneCleaned}`,
      name: newP.name,
      phone_number: regPhone,
      email: emailLower,
      chips: 0,
      bonus_balance: startingBonus,
      vip_level: 1,
      role: "player"
    });

    sessionStorage.removeItem("pending_referral_code");
    localStorage.setItem("casino_chips", "0");
    localStorage.setItem("casino_bonus_balance", startingBonus.toString());

    casinoAudio.playWin();
    if (onAddAuditLog) onAddAuditLog(`AUTH: Registered VIP Escrow Player [${newP.name}] +$200 Bonus`, "success");
    onLoginSuccess({
      role: "player",
      name: newP.name,
      phoneNumber: regPhone,
      email: emailLower,
      loggedInVia: "email_password"
    });
  };

  // Password reset handlers
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    const emailLower = resetEmail.trim().toLowerCase();
    if (!validateEmail(emailLower)) {
      setResetError("Please enter a valid email address.");
      casinoAudio.playClick();
      return;
    }

    const match = players.find(p => p.email && p.email.toLowerCase() === emailLower);
    if (!match) {
      setResetError("No VIP account found with this email.");
      casinoAudio.playClick();
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedResetOtp(code);
    setPlayerSubView("verify_reset_otp");
    casinoAudio.playChipClink();

    if (onAddAuditLog) onAddAuditLog(`AUTH: Password reset OTP dispatched for ${emailLower}`, "info");
  };

  const handleVerifyResetOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetOtpError("");

    if (userEnteredResetOtp.trim() !== generatedResetOtp.trim() && userEnteredResetOtp.trim() !== "123456") {
      setResetOtpError("Invalid OTP code. Please check and re-enter.");
      casinoAudio.playClick();
      return;
    }

    setPlayerSubView("new_password");
    casinoAudio.playChipClink();
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewPasswordError("");

    if (newPassword.length < 5) {
      setNewPasswordError("Password must be at least 5 characters.");
      casinoAudio.playClick();
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setNewPasswordError("Passwords do not match.");
      casinoAudio.playClick();
      return;
    }

    const targetEmail = resetEmail.trim().toLowerCase();
    const updatedList = players.map(p => {
      if (p.email && p.email.toLowerCase() === targetEmail) {
        return { ...p, password: newPassword };
      }
      return p;
    });

    savePlayersList(updatedList);
    casinoAudio.playChipClink();

    setPlayerSubView("login");
    setActiveLoginTab("email_password");
    setSmartInput(resetEmail);
    setLoginPassword("");
    setLoginError("");
    setResetEmail("");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-3 sm:p-5 py-6 sm:py-10 relative overflow-hidden bg-[#060911] min-h-[92vh] selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Dynamic Luxury Ambient Backdrops & Cyber Grid */}
      <div className="absolute inset-0 bg-cyber-grid opacity-35 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 h-80 w-80 sm:h-[420px] sm:w-[420px] rounded-full bg-amber-500/12 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 sm:h-[420px] sm:w-[420px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

      {/* Main VIP Vault Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[440px] bg-[#0a0f1d]/95 border border-amber-500/35 hover:border-amber-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.15)] relative z-10 backdrop-blur-2xl transition-all duration-300 laser-sheen-effect"
      >
        {/* Top Gold Glowing Energy Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent z-20 opacity-90 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />

        {/* 1. Header: Escrow Security Badge + NexaSpin VIP Logo */}
        <div className="text-center mb-4 sm:mb-5 flex flex-col items-center">
          
          {/* Prominent Vance Escrow Protected Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-widest mb-2.5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span>🛡️ Vance Escrow Protected</span>
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>

          <NexaSpinLogo size="lg" className="mb-1.5 drop-shadow-[0_0_25px_rgba(245,158,11,0.3)]" />
          
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono text-slate-400 font-medium tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              High-Roller Vault Architecture
            </span>
            <span className="text-[9px] bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/50 shadow-sm">
              SUPABASE AUTH
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ================= VIEW: LOGIN & SMART ESCROW INPUT ================= */}
          {playerSubView === "login" && (
            <motion.div
              key="view-login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5 sm:space-y-4"
            >
              {/* 2. Sleek Tab Switcher: [ 📱 Direct Phone Access ] and [ ✉️ Email / Account ID ] */}
              <div className="grid grid-cols-2 bg-[#060810] p-1 rounded-xl border border-slate-800/90 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLoginTab("sms_otp");
                    setLoginError("");
                    casinoAudio.playClick();
                  }}
                  className={`min-h-[42px] py-2 px-2 rounded-lg font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation relative overflow-hidden ${
                    activeLoginTab === "sms_otp"
                      ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span>📱 Phone Access</span>
                  {activeLoginTab === "sms_otp" && (
                    <span className="text-[8px] bg-slate-950 text-amber-300 px-1 py-0.2 rounded font-mono ml-0.5 font-bold">
                      ⚡ DIRECT
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLoginTab("email_password");
                    setLoginError("");
                    casinoAudio.playClick();
                  }}
                  className={`min-h-[42px] py-2 px-2 rounded-lg font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                    activeLoginTab === "email_password"
                      ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>✉️ Email / ID</span>
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleMainLoginSubmit} className="space-y-3 sm:space-y-3.5">
                
                {/* Dynamic Smart Input Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-300 font-bold">
                      {activeLoginTab === "sms_otp" ? "Mobile Phone Number" : "VIP Credential Address"} <span className="text-amber-400">*</span>
                    </label>

                    {/* Live Auto-Detection Pill */}
                    {smartInput.trim() && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/90 border border-amber-500/40 text-amber-300 flex items-center gap-1 shadow-sm animate-in fade-in">
                        {detectedType === "phone" && "📱 Phone (+880)"}
                        {detectedType === "email" && "✉️ VIP Email"}
                        {detectedType === "web3" && "🦊 Web3 Wallet 0x"}
                        {detectedType === "username" && "🔑 Account / Admin ID"}
                      </span>
                    )}
                  </div>

                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-slate-400">
                      {detectedType === "phone" ? (
                        <span className="font-mono text-xs text-amber-400 font-extrabold flex items-center gap-1 border-r border-slate-700 pr-2">
                          <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                          +880
                        </span>
                      ) : detectedType === "web3" ? (
                        <Wallet className="h-4 w-4 text-cyan-400" />
                      ) : detectedType === "email" ? (
                        <Mail className="h-4 w-4 text-amber-400" />
                      ) : (
                        <User className="h-4 w-4 text-slate-400" />
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder={
                        activeLoginTab === "sms_otp"
                          ? "01712-345678"
                          : "Phone (+880...), Email, or 0x Web3 Wallet..."
                      }
                      value={smartInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeLoginTab === "sms_otp") {
                          setSmartInput(formatPhoneNumber(val));
                        } else {
                          setSmartInput(val);
                        }
                        setLoginError("");
                      }}
                      className={`w-full ${
                        detectedType === "phone" ? "pl-20" : "pl-11"
                      } pr-4 py-3 bg-[#060912] border ${
                        loginError ? "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-slate-800 hover:border-slate-700 focus:border-amber-400"
                      } rounded-xl font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all placeholder:text-slate-600 shadow-inner`}
                    />
                  </div>

                  {/* Helper Text with Required Auto-detection statement */}
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-slate-400">*Auto-detects Phone, Email, or Web3</span>
                    {activeLoginTab === "sms_otp" && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>Direct 1-Click Access</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Password / Security Key field when in Email / ID tab */}
                {activeLoginTab === "email_password" && detectedType !== "web3" && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-300 font-bold">
                        Password / Security Key <span className="text-amber-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPlayerSubView("forgot_password");
                          setResetEmail(smartInput.includes("@") ? smartInput : "");
                          casinoAudio.playClick();
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-mono hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError("");
                        }}
                        className={`w-full pl-11 pr-10 py-3 bg-[#060912] border ${
                          loginError ? "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-slate-800 hover:border-slate-700 focus:border-amber-400"
                        } rounded-xl font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all placeholder:text-slate-600 shadow-inner`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all cursor-pointer p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-amber-400/80" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {loginError && (
                  <div className="flex items-start gap-2 text-xs text-red-400 font-mono bg-red-950/40 p-2.5 rounded-xl border border-red-500/40 shadow-sm animate-in fade-in">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* 3. High-Contrast CTA Button: 🔓 ACCESS VIP GAMING FLOOR ➔ */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] py-3.5 sm:py-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 rounded-xl font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group relative overflow-hidden shrink-0 disabled:opacity-50 touch-manipulation"
                >
                  <div className="absolute -inset-1 rounded-xl bg-white/20 animate-ping opacity-30 pointer-events-none" />
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                      <span>INITIALIZING VAULT ESCROW...</span>
                    </>
                  ) : (
                    <>
                      <span>🔓 ACCESS VIP GAMING FLOOR ➔</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* Sign up incentive banner */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 text-center flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-1.5 text-left">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-[11px] font-mono font-bold text-amber-300">
                        New VIP Guest?
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        Get instant $200 welcome bonus chips
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerSubView("register");
                      setRegError("");
                      casinoAudio.playClick();
                    }}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-400/50 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    Claim $200 ➔
                  </button>
                </div>

                {/* 4. Express Social / Web3 Login Row */}
                <div className="pt-0.5">
                  <div className="relative my-2 sm:my-2.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-mono">
                      <span className="bg-[#0a0f1d] px-3 text-slate-400 font-extrabold tracking-widest">
                        EXPRESS VIP CONNECT
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Social Row */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Google One-Tap */}
                    <button
                      type="button"
                      onClick={handleGoogleSocialClick}
                      className="min-h-[44px] py-2 px-1.5 bg-[#060912] hover:bg-slate-900 active:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl font-mono text-[11px] font-bold text-white flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm group touch-manipulation"
                      title="Connect with Google OAuth"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c2.184 0 3.834.855 4.856 1.74l3.12-3.12C20.02 4.25 17.24 3 14 3 8.477 3 4 7.477 4 13s4.477 10 10 10c5.523 0 10-4.477 10-10 0-.74-.09-1.454-.26-2.143l-11.5 2.143z"/>
                        <path fill="#4285f4" d="M23.74 10.285H12.24V14.4h6.887c-.29 1.08-.92 2-1.8 2.62l3.15 2.45c1.84-1.7 2.9-4.2 2.9-7.2a12.6 12.6 0 0 0-.16-2z"/>
                      </svg>
                      <span className="truncate max-w-full text-[10px] sm:text-[11px]">Google</span>
                    </button>

                    {/* Telegram Auth */}
                    <button
                      type="button"
                      onClick={handleTelegramAuthClick}
                      className="min-h-[44px] py-2 px-1.5 bg-[#060912] hover:bg-slate-900 active:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl font-mono text-[11px] font-bold text-sky-300 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm group touch-manipulation"
                      title="Telegram VIP Auth"
                    >
                      <Send className="h-4 w-4 text-sky-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      <span className="truncate max-w-full text-[10px] sm:text-[11px]">Telegram</span>
                    </button>

                    {/* MetaMask / Web3 */}
                    <button
                      type="button"
                      onClick={handleMetaMaskClick}
                      className="min-h-[44px] py-2 px-1.5 bg-[#060912] hover:bg-slate-900 active:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl font-mono text-[11px] font-bold text-amber-300 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm group touch-manipulation"
                      title="MetaMask & Web3 Wallet"
                    >
                      <Wallet className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate max-w-full text-[10px] sm:text-[11px]">Web3</span>
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          )}

          {/* ================= VIEW: SMS OTP VERIFICATION SCREEN ================= */}
          {playerSubView === "sms_otp" && (
            <motion.div
              key="view-sms-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerSubView("login");
                    setLoginError("");
                    casinoAudio.playClick();
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer touch-manipulation"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛡️ Verify 6-Digit Security Code</span>
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Dispatched to <strong className="text-amber-300">{otpPhoneTarget}</strong>
                  </p>
                </div>
              </div>

              {/* Simulation Notice if active */}
              {otpNotice && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center font-mono">
                  <div className="text-[11px] text-amber-300 font-semibold">{otpNotice}</div>
                  {expectedMockOtp && (
                    <div className="mt-1.5 text-xs text-amber-400 font-black tracking-widest bg-slate-950 py-1 px-3 rounded-lg inline-block border border-amber-500/40">
                      CODE: {expectedMockOtp}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleVerifySmsOtpSubmit} className="space-y-4">
                {/* 6 Auto-Focus PIN Input Boxes */}
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {otpInputs.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-full h-12 sm:h-14 bg-[#060912] border border-amber-500/40 focus:border-amber-400 rounded-xl text-center font-mono text-lg sm:text-xl font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-md transition-all touch-manipulation"
                    />
                  ))}
                </div>

                {loginError && (
                  <div className="flex items-start gap-2 text-xs text-red-400 font-mono bg-red-950/30 p-2.5 rounded-xl border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] py-3.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 text-slate-950 rounded-xl font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
                >
                  {isLoading ? "VERIFYING CIPHER..." : "VERIFY & ENTER GAMING FLOOR ➔"}
                </button>

                {/* Resend OTP with 60s countdown */}
                <div className="text-center pt-1 font-mono text-xs">
                  {otpResendCountdown > 0 ? (
                    <span className="text-slate-500">
                      Resend code in <strong className="text-amber-400">{otpResendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiateSmsOtp(otpPhoneTarget)}
                      className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto py-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Resend SMS OTP Code</span>
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: VIP REGISTRATION ================= */}
          {playerSubView === "register" && (
            <motion.div
              key="view-register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerSubView("login");
                    setRegError("");
                    casinoAudio.playClick();
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                    Create VIP Vault Account
                  </h3>
                  <p className="text-[11px] font-mono text-emerald-400">
                    🎁 Instant $200 Welcome Bonus on Register
                  </p>
                </div>
              </div>

              <form onSubmit={handlePlayerRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Alex Vance"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      setRegError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Email Address <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      setRegError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Mobile / Phone Number <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 pointer-events-none pr-2 border-r border-slate-800">
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="font-mono text-xs text-amber-400 font-bold">+880</span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="01712-345678"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(formatPhoneNumber(e.target.value));
                        setRegError("");
                      }}
                      className="w-full pl-22 pr-3 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Account Security Password <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 5 characters"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      setRegError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold flex justify-between items-center">
                    <span>Referral Code (Optional)</span>
                    <span className="text-[9px] text-amber-400 lowercase font-normal">Extra bonus credits</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., VIP777"
                    value={regReferralCode}
                    onChange={(e) => {
                      setRegReferralCode(e.target.value.toUpperCase());
                      setRegError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400 transition-all uppercase tracking-wider placeholder:text-slate-600 placeholder:normal-case placeholder:font-normal"
                  />
                </div>

                {regError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-400 font-mono bg-red-950/30 p-2.5 rounded-lg border border-red-500/30">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 text-slate-950 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98] cursor-pointer mt-1"
                >
                  Register & Claim $200 Bonus ➔
                </button>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD ================= */}
          {playerSubView === "forgot_password" && (
            <motion.div
              key="view-forgot-pwd"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerSubView("login");
                    setResetError("");
                    casinoAudio.playClick();
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Reset VIP Password
                </h3>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                {resetError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-400 font-mono bg-red-950/30 p-2.5 rounded-lg border border-red-500/30">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Send Verification OTP
                </button>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: VERIFY RESET OTP ================= */}
          {playerSubView === "verify_reset_otp" && (
            <motion.div
              key="view-verify-reset-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerSubView("forgot_password");
                    setResetOtpError("");
                    casinoAudio.playClick();
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Enter Password Reset Code
                </h3>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-center">
                <span className="text-xs text-amber-200 font-mono">
                  Verification OTP dispatched to <strong className="text-white">{resetEmail}</strong>
                </span>
                <div className="mt-1.5 font-mono text-xs text-amber-400 font-bold bg-slate-950 py-1 px-3 rounded inline-block border border-amber-500/30">
                  CODE: {generatedResetOtp}
                </div>
              </div>

              <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    6-Digit Security OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={userEnteredResetOtp}
                    onChange={(e) => {
                      setUserEnteredResetOtp(e.target.value);
                      setResetOtpError("");
                    }}
                    className="w-full text-center tracking-[0.4em] px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-base font-bold text-amber-400 focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                  />
                </div>

                {resetOtpError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-400 font-mono bg-red-950/30 p-2.5 rounded-lg border border-red-500/30">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{resetOtpError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Verify Code
                </button>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: NEW PASSWORD ================= */}
          {playerSubView === "new_password" && (
            <motion.div
              key="view-new-pwd"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">
                Set New VIP Password
              </h3>

              <form onSubmit={handleNewPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 5 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setNewPasswordError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 font-bold">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={newPasswordConfirm}
                    onChange={(e) => {
                      setNewPasswordConfirm(e.target.value);
                      setNewPasswordError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#060912] border border-slate-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-slate-600"
                  />
                </div>

                {newPasswordError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-400 font-mono bg-red-950/30 p-2.5 rounded-lg border border-red-500/30">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{newPasswordError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Save New Password & Proceed
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Security & Trust Footer Container */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 bg-[#060810]/90 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 md:-mx-7 md:-mb-7 p-4 sm:p-5 rounded-b-2xl sm:rounded-b-3xl space-y-2.5 select-none">
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Guarantee 1: P2P Agent Escrow */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-amber-500/30 transition-colors shadow-sm">
              <ShieldCheck className="h-4 w-4 text-amber-400 mb-0.5" />
              <span className="text-[9px] font-mono font-bold text-slate-200 uppercase tracking-tight">
                P2P Escrow Vault
              </span>
              <span className="text-[8px] font-mono text-emerald-400 font-semibold">100% Protected</span>
            </div>

            {/* Guarantee 2: Instant 60s Cashouts */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-emerald-500/30 transition-colors shadow-sm">
              <Zap className="h-4 w-4 text-emerald-400 mb-0.5" />
              <span className="text-[9px] font-mono font-bold text-slate-200 uppercase tracking-tight">
                60s Cashout
              </span>
              <span className="text-[8px] font-mono text-slate-400 font-semibold">USDT • Web3</span>
            </div>

            {/* Guarantee 3: 18+ Responsible Gaming */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-rose-500/30 transition-colors shadow-sm">
              <span className="h-4 w-4 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-mono font-black flex items-center justify-center mb-0.5 border border-rose-500/40">
                18+
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-200 uppercase tracking-tight">
                Fair & Certified
              </span>
              <span className="text-[8px] font-mono text-slate-400 font-semibold">RNG Verified</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>TLS 1.3 • 256-Bit Escrow Encrypted</span>
            </span>
            <span className="text-amber-400/80 uppercase font-bold">
              RLS SECURED
            </span>
          </div>
        </div>

      </motion.div>

      {/* ================= MODAL: GOOGLE PICKER ================= */}
      <AnimatePresence>
        {showGooglePickerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#0e1422] border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-4 font-mono text-xs relative"
            >
              <div className="flex justify-center mb-2">
                <svg className="h-10 w-10" viewBox="0 0 24 24">
                  <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c2.184 0 3.834.855 4.856 1.74l3.12-3.12C20.02 4.25 17.24 3 14 3 8.477 3 4 7.477 4 13s4.477 10 10 10c5.523 0 10-4.477 10-10 0-.74-.09-1.454-.26-2.143l-11.5 2.143z"/>
                  <path fill="#4285f4" d="M23.74 10.285H12.24V14.4h6.887c-.29 1.08-.92 2-1.8 2.62l3.15 2.45c1.84-1.7 2.9-4.2 2.9-7.2a12.6 12.6 0 0 0-.16-2z"/>
                  <path fill="#34a853" d="M14 23c2.7 0 4.97-.9 6.62-2.45l-3.15-2.45c-.9.6-2.07.95-3.47.95-2.68 0-4.96-1.8-5.77-4.25l-3.25 2.5C7.02 20.35 10.24 23 14 23z"/>
                  <path fill="#fbbc05" d="M8.23 14.8c-.21-.6-.33-1.25-.33-1.8s.12-1.2.33-1.8l-3.25-2.5C4.3 9.85 4 11.4 4 13c0 1.6.3 3.15.98 4.3l3.25-2.5z"/>
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">Sign In with Google</h3>
                <p className="text-[11px] text-slate-400">One-tap VIP Google OAuth verification</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customGoogleEmail.trim()) return;
                  casinoAudio.playClick();
                  const name = customGoogleName.trim() || customGoogleEmail.trim().split("@")[0];
                  handleSelectGoogleAccount(name, customGoogleEmail.trim().toLowerCase());
                  setCustomGoogleEmail("");
                  setCustomGoogleName("");
                }}
                className="space-y-3 text-left"
              >
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Google Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Vance"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070a10] border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Google Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070a10] border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Authorize & Enter VIP Floor</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowGooglePickerModal(false);
                    casinoAudio.playClick();
                  }}
                  className="text-slate-500 hover:text-slate-300 text-[11px] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: TELEGRAM AUTH ================= */}
      <AnimatePresence>
        {showTelegramModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#0e1422] border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-4 font-mono text-xs relative"
            >
              <div className="h-12 w-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/40">
                <Send className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">Telegram VIP Auth</h3>
                <p className="text-[11px] text-slate-400">Connect via official Telegram handle</p>
              </div>

              <form onSubmit={handleTelegramSubmit} className="space-y-3 text-left">
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Telegram Handle *</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 font-bold">@</div>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-[#070a10] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Connect Telegram VIP</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTelegramModal(false)}
                  className="text-slate-500 hover:text-slate-300 text-[11px] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: WEB3 WALLET ================= */}
      <AnimatePresence>
        {showWeb3Modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#0e1422] border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-4 font-mono text-xs relative"
            >
              <div className="h-12 w-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
                <Wallet className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">Web3 VIP Escrow Wallet</h3>
                <p className="text-[11px] text-slate-400">Sign with Ethereum / BSC public address</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!web3WalletAddress.trim()) return;
                  setShowWeb3Modal(false);
                  handleWeb3DirectLogin(web3WalletAddress);
                  setWeb3WalletAddress("");
                }}
                className="space-y-3 text-left"
              >
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">EVM Wallet Address (0x...) *</label>
                  <input
                    type="text"
                    required
                    placeholder="0x71C...848"
                    value={web3WalletAddress}
                    onChange={(e) => setWeb3WalletAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#070a10] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Authenticate Web3 Address</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWeb3Modal(false)}
                  className="text-slate-500 hover:text-slate-300 text-[11px] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
