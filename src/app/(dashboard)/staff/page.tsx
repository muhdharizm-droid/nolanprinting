"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Phone,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Key,
  UserCheck,
  User,
  Eye,
  EyeOff,
  Search,
  ShoppingCart,
  Lock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  role: "owner" | "cashier" | "stock_handler";
  phoneNumber: string;
  gender: string;
  race: string;
  address: string;
  createdAt: string;
  _count?: { sales: number };
}

const roleStyles: Record<string, { badge: string; label: string; icon: string }> = {
  owner: {
    badge: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    label: "👑 Store Owner (Admin)",
    icon: "👑",
  },
  cashier: {
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    label: "💳 Cashier",
    icon: "💳",
  },
  stock_handler: {
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    label: "📦 Stock Manager",
    icon: "📦",
  },
};

export default function StaffPage() {
  const { t } = useI18n();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSelfOnly, setIsSelfOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // View Details Modal (Registration Dossier)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<StaffUser | null>(null);

  // Admin Add Staff Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addRole, setAddRole] = useState<"cashier" | "stock_handler" | "owner">("cashier");
  const [addPhone, setAddPhone] = useState("");
  const [addGender, setAddGender] = useState("Male");
  const [addRace, setAddRace] = useState("Malay");
  const [addAddress, setAddAddress] = useState("");
  const [addErrorMsg, setAddErrorMsg] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Admin Edit Staff Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<"cashier" | "stock_handler" | "owner">("cashier");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editRace, setEditRace] = useState("Malay");
  const [editAddress, setEditAddress] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Self Profile Form (for Cashier & Stock Handler)
  const [selfFullName, setSelfFullName] = useState("");
  const [selfPhone, setSelfPhone] = useState("");
  const [selfGender, setSelfGender] = useState("Male");
  const [selfRace, setSelfRace] = useState("Malay");
  const [selfAddress, setSelfAddress] = useState("");
  const [selfPassword, setSelfPassword] = useState("");
  const [selfMsg, setSelfMsg] = useState("");
  const [selfError, setSelfError] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);

  // Global Notification & Password Toggles
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showSelfPassword, setShowSelfPassword] = useState(false);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [meRes, staffRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/staff"),
      ]);
      const meData = await meRes.json();
      const staffData = await staffRes.json();

      if (meData.user) {
        setCurrentUser(meData.user);
      }

      if (staffData.success) {
        setStaffList(staffData.staff || []);
        setIsSelfOnly(Boolean(staffData.isSelfOnly));

        // If self only, populate self form
        if (staffData.isSelfOnly && staffData.staff?.length > 0) {
          const self = staffData.staff[0];
          setSelfFullName(self.fullName || "");
          setSelfPhone(self.phoneNumber || "");
          setSelfGender(self.gender || "Male");
          setSelfRace(self.race || "Malay");
          setSelfAddress(self.address || "");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const isAdmin = currentUser?.role === "owner" && !isSelfOnly;

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phoneNumber && s.phoneNumber.includes(searchTerm));
    const matchesRole = filterRole === "all" || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Open Details Modal
  const openViewModal = (st: StaffUser) => {
    setViewStaff(st);
    setViewModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setAddUsername("");
    setAddPassword("");
    setShowAddPassword(false);
    setAddFullName("");
    setAddRole("cashier");
    setAddPhone("");
    setAddGender("Male");
    setAddRace("Malay");
    setAddAddress("");
    setAddErrorMsg("");
    setAddModalOpen(true);
  };

  // Handle Admin Add Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrorMsg("");
    setAddLoading(true);

    try {
      if (addPassword.trim().length < 4) {
        setAddErrorMsg("Password must be at least 4 characters long.");
        setAddLoading(false);
        return;
      }

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: addUsername.trim(),
          password: addPassword.trim(),
          fullName: addFullName.trim(),
          role: addRole,
          phoneNumber: addPhone.trim(),
          gender: addGender,
          race: addRace,
          address: addAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create staff account.");
      }

      setAddModalOpen(false);
      setSuccessToast(`Staff account "${addFullName}" created successfully!`);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchStaffData();
    } catch (err: any) {
      setAddErrorMsg(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (st: StaffUser) => {
    setEditingStaff(st);
    setEditFullName(st.fullName);
    setEditUsername(st.username);
    setEditRole(st.role);
    setEditPhone(st.phoneNumber);
    setEditGender(st.gender || "Male");
    setEditRace(st.race || "Malay");
    setEditAddress(st.address || "");
    setEditPassword("");
    setShowEditPassword(false);
    setEditErrorMsg("");
    setEditModalOpen(true);
  };

  // Handle Admin Edit Staff
  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditErrorMsg("");
    setEditLoading(true);

    try {
      const payload: any = {
        id: editingStaff.id,
        fullName: editFullName,
        username: editUsername,
        role: editRole,
        phoneNumber: editPhone,
        gender: editGender,
        race: editRace,
        address: editAddress,
      };
      if (editPassword.trim()) {
        if (editPassword.trim().length < 4) {
          setEditErrorMsg("New password must be at least 4 characters long.");
          setEditLoading(false);
          return;
        }
        payload.password = editPassword.trim();
      }

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update staff member.");
      }

      setEditModalOpen(false);
      setSuccessToast(data.message || "Staff member updated successfully!");
      setTimeout(() => setSuccessToast(null), 5000);
      fetchStaffData();
    } catch (err: any) {
      setEditErrorMsg(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Admin Delete Staff
  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/staff?id=${deletingStaff.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete staff account.");
      }

      setDeleteModalOpen(false);
      setDeletingStaff(null);
      setSuccessToast("Staff account deleted successfully.");
      setTimeout(() => setSuccessToast(null), 5000);
      fetchStaffData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Cashier/Stock Handler Self Update
  const handleSelfUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError("");
    setSelfMsg("");
    setSelfSaving(true);

    try {
      const payload: any = {
        fullName: selfFullName,
        phoneNumber: selfPhone,
        gender: selfGender,
        race: selfRace,
        address: selfAddress,
      };
      if (selfPassword.trim()) {
        if (selfPassword.trim().length < 4) {
          setSelfError("New password must be at least 4 characters long.");
          setSelfSaving(false);
          return;
        }
        payload.password = selfPassword.trim();
      }

      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save profile changes.");
      }

      setSelfMsg(data.message || "Your profile details have been updated successfully!");
      setSelfPassword("");
      setShowSelfPassword(false);
      setTimeout(() => setSelfMsg(""), 5000);
      fetchStaffData();
    } catch (err: any) {
      setSelfError(err.message);
    } finally {
      setSelfSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              {isAdmin ? t("staff") : "Staff Management - My Profile"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Admin: View staff roster and registration details, create accounts, and manage permissions"
                : "Personal Staff Profile: View and edit your registered personal and contact details"}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        )}
      </div>

      {/* Global Success Notification */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* VIEW FOR NON-ADMIN (Cashier / Stock Manager): View & Edit Own Personal Details */}
      {!isAdmin && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded-2xl flex items-center justify-center text-lg">
                {currentUser?.fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  {currentUser?.fullName}
                </h2>
                <p className="text-xs text-slate-400 font-mono">@{currentUser?.username}</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                roleStyles[currentUser?.role]?.badge || "bg-slate-100"
              }`}
            >
              {roleStyles[currentUser?.role]?.label || currentUser?.role}
            </span>
          </div>

          {selfMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{selfMsg}</span>
            </div>
          )}

          {selfError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{selfError}</span>
            </div>
          )}

          <form onSubmit={handleSelfUpdate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Username (System ID - Locked)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.username || ""}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={selfFullName}
                  onChange={(e) => setSelfFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 012-3456789"
                  value={selfPhone}
                  onChange={(e) => setSelfPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={selfGender}
                  onChange={(e) => setSelfGender(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Race / Ethnicity
                </label>
                <select
                  value={selfRace}
                  onChange={(e) => setSelfRace(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Malay">Malay</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Indian">Indian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Residential Address
              </label>
              <textarea
                rows={3}
                placeholder="Enter residential address..."
                value={selfAddress}
                onChange={(e) => setSelfAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Change Password (Leave blank to keep current)
              </label>
              <div className="relative">
                <input
                  type={showSelfPassword ? "text" : "password"}
                  placeholder="Enter new password (min 4 characters)"
                  value={selfPassword}
                  onChange={(e) => setSelfPassword(e.target.value)}
                  className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowSelfPassword(!showSelfPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showSelfPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={selfSaving}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {selfSaving ? "Saving Changes..." : "Save My Profile Details"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW FOR ADMIN: Staff Roster with Full Registration Details */}
      {isAdmin && (
        <div className="space-y-4">
          {/* Controls: Search and Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, @username, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Role:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="all">All Roles ({staffList.length})</option>
                <option value="owner">Store Owners ({staffList.filter((s) => s.role === "owner").length})</option>
                <option value="cashier">Cashiers ({staffList.filter((s) => s.role === "cashier").length})</option>
                <option value="stock_handler">Stock Managers ({staffList.filter((s) => s.role === "stock_handler").length})</option>
              </select>
            </div>
          </div>

          {/* Staff Grid Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Loading staff roster and registration details...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No staff members found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((st) => (
                <div
                  key={st.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors hover:border-blue-400 dark:hover:border-blue-500"
                >
                  <div>
                    {/* Top Row: Role Badge & Action Buttons */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                          roleStyles[st.role]?.badge || "bg-slate-100"
                        }`}
                      >
                        {roleStyles[st.role]?.label || st.role}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openViewModal(st)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                          title="View Registration Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {st.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              setDeletingStaff(st);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Staff Name & Username */}
                    <div className="mb-3">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">
                        {st.fullName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">@{st.username}</p>
                    </div>

                    {/* Registration Meta Grid */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{st.phoneNumber || "No phone recorded"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{st.gender || "Male"} • {st.race || "Malay"}</span>
                      </div>
                      {st.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {st.address}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Registered {formatDate(st.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Sales count & View Profile Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{st._count?.sales || 0} sales</span>
                    </span>
                    <button
                      onClick={() => openViewModal(st)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Admin View Registration Dossier Details */}
      {viewModalOpen && viewStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Staff Registration Profile
                </h3>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 bg-blue-600 text-white font-extrabold rounded-2xl flex items-center justify-center text-xl shadow-md shadow-blue-600/30">
                  {viewStaff.fullName[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">
                    {viewStaff.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">@{viewStaff.username}</p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      roleStyles[viewStaff.role]?.badge || "bg-slate-100"
                    }`}
                  >
                    {roleStyles[viewStaff.role]?.label || viewStaff.role}
                  </span>
                </div>
              </div>

              {/* Registration Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Phone Number</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-0.5 font-mono">
                    {viewStaff.phoneNumber || "N/A"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Gender & Race</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {viewStaff.gender || "Male"} • {viewStaff.race || "Malay"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Registered On</span>
                  <p className="font-bold text-slate-800 dark:text-white mt-0.5">
                    {formatDate(viewStaff.createdAt)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Sales Processed</span>
                  <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {viewStaff._count?.sales || 0} transactions
                  </p>
                </div>
              </div>

              {/* Residential Address */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Residential Address</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                  {viewStaff.address || "No residential address provided."}
                </p>
              </div>

              {/* Security Details Notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Security credentials (password hash, recovery questions) are encrypted and protected.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    openEditModal(viewStaff);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Add New Staff */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Add New Staff Member</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-4 text-xs">
              {addErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
                  {addErrorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siti Nurhaliza"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. siti"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                  <select
                    value={addRole}
                    onChange={(e: any) => setAddRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="cashier">💳 Cashier</option>
                    <option value="stock_handler">📦 Stock Manager</option>
                    <option value="owner">👑 Store Owner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? "text" : "password"}
                      required
                      placeholder="Min 4 characters"
                      minLength={4}
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 012-3456789"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                  <select
                    value={addGender}
                    onChange={(e) => setAddGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Race / Ethnicity</label>
                  <select
                    value={addRace}
                    onChange={(e) => setAddRace(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Malay">Malay</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Enter residential address..."
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {addLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Edit Staff */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Edit Staff Account</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="p-6 space-y-4 text-xs">
              {editErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
                  {editErrorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                  <select
                    value={editRole}
                    onChange={(e: any) => setEditRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="cashier">💳 Cashier</option>
                    <option value="stock_handler">📦 Stock Manager</option>
                    <option value="owner">👑 Store Owner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password Reset (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Min 4 chars (leave blank to keep)"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Race / Ethnicity</label>
                  <select
                    value={editRace}
                    onChange={(e) => setEditRace(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Malay">Malay</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Indian">Indian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {editLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Admin Delete Confirmation */}
      {deleteModalOpen && deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Delete Staff Account</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete staff account{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {deletingStaff.fullName} (@{deletingStaff.username})
                </strong>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteStaff}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
