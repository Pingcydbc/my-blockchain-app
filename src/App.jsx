import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        html, body, #root { width: 100%; height: 100%; background: #F7FAFC; overflow: hidden; }
        input { color: #000 !important; font-size: 16px !important; font-weight: 800 !important; }
        button { font-weight: 800 !important; transition: all 0.2s; }
        button:active { transform: scale(0.95); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E0; border-radius: 10px; }
    `}</style>
);

function App() {
    const [view, setView] = useState('login');
    const [isRegistering, setIsRegistering] = useState(false);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [walletInfo, setWalletInfo] = useState({ to: '', amount: '' });
    const [balance, setBalance] = useState('0');
    const [transactions, setTransactions] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const CONTRACT_OERC = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";
    const API_BASE = "https://my-blockchain-app-back.vercel.app";

    // --- 1. ฟังก์ชันดึงข้อมูล (ดึงใหม่และล้างของเก่าเสมอ) ---
    const fetchData = useCallback(async (address, showToast = false) => {
        if (!address) return;
        setIsRefreshing(true);
        
        try {
            const provider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
            const abi = ["function balanceOf(address owner) view returns (uint256)"];
            const contract = new ethers.Contract(CONTRACT_OERC, abi, provider);

            // ดึงยอดคงเหลือ
            const rawBalance = await contract.balanceOf(address);
            setBalance(ethers.utils.formatUnits(rawBalance, 18));

            // ดึงประวัติธุรกรรม
            const res = await axios.get(`${API_BASE}/transactions?address=${address}`);
            if (res.data && res.data.success) {
                setTransactions(Array.isArray(res.data.transactions) ? res.data.transactions : []);
            }

            if (showToast) {
                Swal.fire({
                    icon: 'success',
                    title: 'อัปเดตข้อมูลแล้ว',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        } catch (e) {
            console.error("Fetch Data Error:", e);
        } finally {
            setIsRefreshing(false);
        }
    }, [API_BASE]);

    // --- 2. การจัดการ Session ---
    useEffect(() => {
        const savedUser = localStorage.getItem('oerc_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setView('dashboard');
        }
    }, []);

    useEffect(() => {
        if (user && user.wallet_address) {
            fetchData(user.wallet_address);
        }
    }, [user, fetchData, activeTab]);

    // --- 3. ฟังก์ชันระบบ ---
    const handleLogin = async () => {
        if (!formData.username || !formData.password) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        try {
            const res = await axios.post(`${API_BASE}/login`, formData);
            localStorage.setItem('oerc_user', JSON.stringify(res.data));
            setUser(res.data);
            setView('dashboard');
            Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', timer: 1500, showConfirmButton: false });
        } catch (e) {
            Swal.fire('ผิดพลาด', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    };

    const handleRegister = async () => {
        if (!formData.username || !formData.password) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        try {
            await axios.post(`${API_BASE}/register`, formData);
            Swal.fire('สำเร็จ', 'สมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ', 'success');
            setIsRegistering(false);
        } catch (e) {
            Swal.fire('ผิดพลาด', 'สมัครสมาชิกไม่สำเร็จ', 'error');
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'ยืนยันการออกจากระบบ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4A90E2',
            cancelButtonColor: '#E53E3E',
            confirmButtonText: 'ใช่, ออกจากระบบ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('oerc_user');
                setUser(null);
                setBalance('0');
                setTransactions([]);
                setView('login');
            }
        });
    };

    const handleGenerateWallet = async () => {
        Swal.fire({
            title: 'กำลังสร้างกระเป๋า...',
            text: 'ระบบกำลังสร้างกุญแจส่วนตัวและบันทึกลงฐานข้อมูล',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        try {
            const res = await axios.post(`${API_BASE}/generate-wallet`, { username: user.username });
            if (res.data.address) {
                const updatedUser = { ...user, wallet_address: res.data.address };
                localStorage.setItem('oerc_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                await Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'สร้างกระเป๋าเงินดิจิทัลเรียบร้อย', timer: 1500, showConfirmButton: false });
                window.location.reload();
            }
        } catch (e) {
            Swal.close();
            Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างกระเป๋า', 'error');
        }
    };

    const handleTransfer = async () => {
        if (!walletInfo.to || !walletInfo.amount) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        
        const confirm = await Swal.fire({
            title: 'ยืนยันการโอน?',
            text: `คุณต้องการโอน ${walletInfo.amount} OERC ไปยังที่อยู่นี้ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4A90E2',
            confirmButtonText: 'ตกลง, โอนเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({ title: 'กำลังประมวลผล...', text: 'กรุณารอสักครู่ บล็อกเชนกำลังบันทึกธุรกรรม', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        try {
            const res = await axios.post(`${API_BASE}/transfer`, {
                fromUsername: user.username,
                toAddress: walletInfo.to,
                amount: walletInfo.amount
            });
            Swal.fire({
                icon: 'success',
                title: 'โอนเหรียญสำเร็จ!',
                html: `ทำรายการเรียบร้อยแล้ว<br/><small style="font-size:10px">${res.data.hash}</small>`,
                confirmButtonText: 'ตกลง'
            });
            setWalletInfo({ to: '', amount: '' });
            fetchData(user.wallet_address);
        } catch (e) {
            Swal.fire('ล้มเหลว', e.response?.data?.error || 'โอนไม่สำเร็จ กรุณาตรวจสอบยอดเงินและค่าแก๊ส', 'error');
        }
    };

    // --- 4. การแสดงผล UI ---
    if (view === 'login') {
        return (
            <div style={loginContainerStyle}>
                <GlobalStyles />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={loginCardStyle}>
                    <h1 style={{ color: '#000', fontWeight: '800', fontSize: '36px', letterSpacing: '-1px' }}>OERC</h1>
                    <p style={{ color: '#666', margin: '10px 0 30px 0', fontWeight: '600' }}>
                        {isRegistering ? 'สร้างบัญชีผู้ใช้ใหม่' : 'ระบบจัดการเหรียญ IT-CMTC'}
                    </p>
                    <input placeholder="Username" onChange={e => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
                    <input type="password" placeholder="Password" onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
                    <button onClick={isRegistering ? handleRegister : handleLogin} style={primaryBtnStyle}>
                        {isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </button>
                    <p onClick={() => setIsRegistering(!isRegistering)} style={toggleLinkStyle}>
                        {isRegistering ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <GlobalStyles />
            <div style={sidebarStyle}>
                <div style={{ padding: '0 20px' }}>
                    <h2 style={{ color: '#000', fontWeight: '800', marginBottom: '40px', fontSize: '24px' }}>🏦 IT-CMTC</h2>
                </div>
                <div style={{ flex: 1 }}>
                    <SidebarItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="หน้าหลัก" icon="🏠" />
                    <SidebarItem active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} label="โอนเหรียญ" icon="💸" />
                    <SidebarItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="ประวัติธุรกรรม" icon="📜" />
                </div>
                <button onClick={handleLogout} style={logoutBtnStyle}>ออกจากระบบ</button>
            </div>

            <div style={{ flex: 1, padding: '40px', background: '#F7FAFC', overflowY: 'auto' }}>
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ color: '#000', fontWeight: '800', fontSize: '28px' }}>สวัสดี, {user?.username}</h2>
                        <p style={{ color: '#666', fontWeight: '600' }}>ยินดีต้อนรับสู่กระเป๋าเงินดิจิทัลของคุณ</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {user?.wallet_address ? (
                            <div onClick={() => { 
                                navigator.clipboard.writeText(user.wallet_address); 
                                Swal.fire({ icon: 'success', title: 'คัดลอกเลขกระเป๋าแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }); 
                            }} style={walletBadgeStyle}>
                                <span style={{ color: '#000', fontWeight: '800' }}>
                                    📍 {user.wallet_address.substring(0, 8)}...{user.wallet_address.slice(-4)}
                                </span>
                            </div>
                        ) : (
                            <button onClick={handleGenerateWallet} style={genBtnStyle}>➕ สร้างกระเป๋าใหม่</button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        
                        {activeTab === 'overview' && (
                            <div style={overviewGrid}>
                                <div style={balanceCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <p style={{ fontWeight: '800', fontSize: '18px', opacity: 0.9 }}>ยอดเงินคงเหลือ</p>
                                        <button onClick={() => fetchData(user.wallet_address, true)} style={refreshBtnStyle}>
                                            {isRefreshing ? '⌛' : '🔄'}
                                        </button>
                                    </div>
                                    <h1 style={{ fontSize: '56px', fontWeight: '800', margin: '15px 0' }}>
                                        {balance} <span style={{ fontSize: '24px', opacity: 0.8 }}>OERC</span>
                                    </h1>
                                    <p style={{ fontWeight: '600', opacity: 0.8 }}>Sepolia Testnet Network</p>
                                </div>
                                
                                <div style={statusCard}>
                                    <p style={{ fontWeight: '800', color: '#000', marginBottom: '15px' }}>QR Code สำหรับรับเงิน</p>
                                    <div style={{ background: '#fff', padding: '15px', borderRadius: '20px', display: 'inline-block', border: '1px solid #EEE' }}>
                                        {user?.wallet_address ? (
                                            <QRCodeCanvas value={user.wallet_address} size={150} />
                                        ) : (
                                            <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', borderRadius: '10px', color: '#AAA', fontWeight: '700' }}>
                                                ยังไม่มีกระเป๋า
                                            </div>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', marginTop: '10px', color: '#666', fontWeight: '700' }}>สแกนที่อยู่กระเป๋าของคุณเพื่อรับเหรียญ</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transfer' && (
                            <div style={cardContainer}>
                                <h3 style={{ color: '#000', marginBottom: '25px', fontSize: '22px', fontWeight: '800' }}>ส่งเหรียญ OERC</h3>
                                <label style={labelStyle}>ที่อยู่กระเป๋าผู้รับ (Recipient Address)</label>
                                <input placeholder="0x..." value={walletInfo.to} onChange={e => setWalletInfo({ ...walletInfo, to: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>จำนวนที่ต้องการส่ง (Amount)</label>
                                <input type="number" placeholder="0.00" value={walletInfo.amount} onChange={e => setWalletInfo({ ...walletInfo, amount: e.target.value })} style={inputStyle} />
                                <div style={{ background: '#FFFBEB', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #FEF3C7' }}>
                                    <p style={{ fontSize: '13px', color: '#92400E', fontWeight: '700' }}>⚠️ โปรดตรวจสอบที่อยู่ผู้รับให้ถูกต้อง ธุรกรรมบนบล็อกเชนไม่สามารถยกเลิกได้</p>
                                </div>
                                <button onClick={handleTransfer} style={primaryBtnStyle}>ยืนยันการทำรายการ</button>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div style={cardContainer}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                    <h3 style={{ color: '#000', fontSize: '22px', fontWeight: '800' }}>ประวัติการทำรายการ</h3>
                                    <button onClick={() => fetchData(user.wallet_address, true)} style={{ background: '#F0F4F8', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', color: '#4A90E2' }}>🔄 รีเฟรช</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {transactions.length > 0 ? (
                                        transactions.map((tx, i) => {
                                            const isSent = tx.from?.toLowerCase() === user?.wallet_address?.toLowerCase();
                                            return (
                                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={i} style={txCardStyle}>
                                                    <div style={{ ...iconCircle, background: isSent ? '#FFF5F5' : '#F0FFF4' }}>
                                                        {isSent ? '📤' : '📥'}
                                                    </div>
                                                    <div style={{ flex: 1, marginLeft: '15px' }}>
                                                        <p style={{ fontWeight: '800', fontSize: '16px', color: '#000' }}>{isSent ? 'ส่งเหรียญออก' : 'ได้รับเหรียญเข้า'}</p>
                                                        <p style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
                                                            {tx.timeStamp ? new Date(tx.timeStamp * 1000).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: '800', fontSize: '18px', color: isSent ? '#E53E3E' : '#38A169' }}>
                                                            {isSent ? '-' : '+'} {ethers.utils.formatUnits(tx.value || '0', tx.tokenDecimal || 18)}
                                                        </p>
                                                        <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#4A90E2', textDecoration: 'none', fontWeight: '800' }}>ดูรายละเอียด ↗</a>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📜</div>
                                            <p style={{ fontWeight: '800', color: '#A0AEC0' }}>ยังไม่มีรายการธุรกรรมในขณะนี้</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Styles (คงเดิมและเพิ่มเติม) ---
const sidebarStyle = { width: '280px', background: '#fff', padding: '40px 0', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' };
const loginContainerStyle = { display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' };
const loginCardStyle = { padding: '50px 40px', background: '#fff', borderRadius: '40px', width: '450px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '18px', marginBottom: '15px', borderRadius: '18px', border: '2px solid #E2E8F0', background: '#F8FAFC', fontWeight: '800', fontSize: '16px', outline: 'none' };
const primaryBtnStyle = { width: '100%', padding: '18px', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '18px', fontSize: '16px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 10px 15px -3px rgba(74, 144, 226, 0.3)' };
const walletBadgeStyle = { background: '#fff', padding: '12px 25px', borderRadius: '50px', border: '2px solid #E2E8F0', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s' };
const genBtnStyle = { padding: '12px 25px', background: '#38A169', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(56, 161, 105, 0.3)', fontWeight: '800' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', maxWidth: '1100px', margin: '0 auto 50px auto' };
const toggleLinkStyle = { color: '#4A90E2', marginTop: '25px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' };
const logoutBtnStyle = { margin: '0 20px', padding: '16px', background: '#FFF5F5', color: '#C53030', border: 'none', borderRadius: '15px', cursor: 'pointer', marginTop: 'auto', fontWeight: '800' };
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', maxWidth: '1100px', margin: '0 auto' };
const balanceCard = { background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', padding: '40px', borderRadius: '35px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(74, 144, 226, 0.3)' };
const statusCard = { background: '#fff', padding: '40px', borderRadius: '35px', border: '1px solid #E2E8F0', textAlign: 'center' };
const cardContainer = { background: '#fff', padding: '40px', borderRadius: '35px', border: '1px solid #E2E8F0', maxWidth: '900px', margin: '0 auto' };
const labelStyle = { display: 'block', marginBottom: '10px', color: '#000', fontWeight: '800', fontSize: '14px' };
const refreshBtnStyle = { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '35px', height: '35px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const txCardStyle = { display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '22px', background: '#fff', border: '1px solid #F0F4F8', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' };
const iconCircle = { width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' };

const SidebarItem = ({ active, label, icon, onClick }) => (
    <div onClick={onClick} style={{ margin: '0 15px 8px 15px', padding: '16px 20px', cursor: 'pointer', borderRadius: '18px', background: active ? '#4A90E2' : 'transparent', color: active ? '#fff' : '#666', fontWeight: '800', display: 'flex', gap: '15px', transition: 'all 0.2s', alignItems: 'center' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span> 
        <span style={{ fontSize: '15px' }}>{label}</span>
    </div>
);

export default App;