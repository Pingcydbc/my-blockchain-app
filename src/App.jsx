import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from "html5-qrcode";

const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; color: #000; }
        html, body, #root { width: 100%; height: 100%; background: #F7FAFC; overflow: hidden; }
        
        input { color: #000 !important; font-size: 16px !important; font-weight: 800 !important; outline: none; border: 2px solid #E2E8F0; }
        input::placeholder { color: #A0AEC0; }
        button { font-weight: 800 !important; transition: all 0.2s; cursor: pointer; border: none; }
        button:active { transform: scale(0.95); }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E0; border-radius: 10px; }
        
        #reader { border: none !important; border-radius: 20px; overflow: hidden; background: #fff !important; }
        #reader button { padding: 10px 20px !important; background: #4A90E2 !important; color: #fff !important; border-radius: 12px !important; font-weight: 800 !important; }
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
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
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef(null);

    const CONTRACT_OERC = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";
    const API_BASE = "https://my-blockchain-app-back.vercel.app";

    const fetchData = useCallback(async (address, showToast = false) => {
        if (!address) return;
        setIsRefreshing(true);
        try {
            const provider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
            const abi = ["function balanceOf(address owner) view returns (uint256)"];
            const contract = new ethers.Contract(CONTRACT_OERC, abi, provider);
            const rawBalance = await contract.balanceOf(address);
            setBalance(ethers.utils.formatUnits(rawBalance, 18));

            const res = await axios.get(`${API_BASE}/transactions?address=${address}`);
            if (res.data?.success) setTransactions(res.data.transactions || []);
            if (showToast) Swal.fire({ icon: 'success', title: 'อัปเดตข้อมูลแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
    }, [API_BASE]);

    useEffect(() => {
        const savedUser = localStorage.getItem('oerc_user');
        if (savedUser) { setUser(JSON.parse(savedUser)); setView('dashboard'); }
    }, []);

    useEffect(() => {
        if (user?.wallet_address) fetchData(user.wallet_address);
    }, [user, fetchData, activeTab]);

    // --- System Functions ---
    const handleLogin = async () => {
        if (!formData.username || !formData.password) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        try {
            const res = await axios.post(`${API_BASE}/login`, formData);
            localStorage.setItem('oerc_user', JSON.stringify(res.data));
            setUser(res.data);
            setView('dashboard');
        } catch (e) { Swal.fire('ผิดพลาด', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error'); }
    };

    const handleRegister = async () => {
        if (!formData.username || !formData.password) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        try {
            await axios.post(`${API_BASE}/register`, formData);
            Swal.fire('สำเร็จ', 'สมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ', 'success');
            setIsRegistering(false);
        } catch (e) { Swal.fire('ผิดพลาด', 'สมัครสมาชิกไม่สำเร็จ', 'error'); }
    };

    const handleGenerateWallet = async () => {
        Swal.fire({ title: 'กำลังสร้างกระเป๋า...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await axios.post(`${API_BASE}/generate-wallet`, { username: user.username });
            if (res.data.address) {
                const updatedUser = { ...user, wallet_address: res.data.address };
                localStorage.setItem('oerc_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                await Swal.fire({ icon: 'success', title: 'สร้างกระเป๋าสำเร็จ!', timer: 1500, showConfirmButton: false });
            }
        } catch (e) { Swal.fire('ล้มเหลว', 'เกิดข้อผิดพลาดในการสร้างกระเป๋า', 'error'); }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'ยืนยันการออกจากระบบ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
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

    const handleTransfer = async () => {
        if (!walletInfo.to || !walletInfo.amount) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        const confirm = await Swal.fire({ title: 'ยืนยันการโอน?', text: `คุณต้องการโอน ${walletInfo.amount} OERC?`, icon: 'question', showCancelButton: true });
        if (!confirm.isConfirmed) return;

        Swal.fire({ title: 'กำลังโอน...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await axios.post(`${API_BASE}/transfer`, {
                fromUsername: user.username,
                toAddress: walletInfo.to,
                amount: walletInfo.amount
            });
            Swal.fire('สำเร็จ!', `Hash: ${res.data.hash.substring(0, 10)}...`, 'success');
            setWalletInfo({ to: '', amount: '' });
            fetchData(user.wallet_address);
        } catch (e) { Swal.fire('ล้มเหลว', 'โอนไม่สำเร็จ', 'error'); }
    };

    // --- Scanner Logic ---
    useEffect(() => {
        if (showScanner) {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
            scanner.render((text) => {
                setWalletInfo(prev => ({ ...prev, to: text }));
                setShowScanner(false);
                scanner.clear();
            }, () => { });
            scannerRef.current = scanner;
        }
        return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => { }); };
    }, [showScanner]);

    if (view === 'login') {
        return (
            <div style={loginContainerStyle}>
                <GlobalStyles />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={loginCardStyle}>
                    <h1 style={{ fontWeight: '800', fontSize: '42px' }}>OERC</h1>
                    <p style={{ margin: '10px 0 30px 0', fontWeight: '800' }}>{isRegistering ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ IT-CMTC'}</p>
                    <input placeholder="Username" onChange={e => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
                    <input type="password" placeholder="Password" onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
                    <button onClick={isRegistering ? handleRegister : handleLogin} style={primaryBtnStyle}>
                        <span style={{ color: '#fff' }}>{isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</span>
                    </button>
                    <p onClick={() => setIsRegistering(!isRegistering)} style={toggleLinkStyle}>
                        {isRegistering ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครที่นี่'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <GlobalStyles />
            <div style={sidebarStyle}>
                <div style={{ padding: '0 20px' }}><h2 style={{ fontWeight: '800', marginBottom: '40px', fontSize: '24px' }}>🏦 IT-CMTC</h2></div>
                <div style={{ flex: 1 }}>
                    <SidebarItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="หน้าหลัก" icon="🏠" />
                    <SidebarItem active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} label="โอนเหรียญ" icon="💸" />
                    <SidebarItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="ประวัติธุรกรรม" icon="📜" />
                </div>
                <button onClick={handleLogout} style={logoutBtnStyle}>ออกจากระบบ</button>
            </div>

            <div style={{ flex: 1, padding: '40px', background: '#F7FAFC', overflowY: 'auto' }}>
                <div style={headerStyle}>
                    <div><h2 style={{ fontWeight: '800', fontSize: '28px' }}>สวัสดี, {user?.username}</h2></div>
                    {user?.wallet_address ? (
                        <div onClick={() => { navigator.clipboard.writeText(user.wallet_address); Swal.fire({ icon: 'success', title: 'คัดลอกแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }} style={walletBadgeStyle}>
                            <span style={{ fontWeight: '800' }}>📍 {user.wallet_address.substring(0, 8)}...{user.wallet_address.slice(-4)}</span>
                        </div>
                    ) : (
                        <button onClick={handleGenerateWallet} style={genBtnStyle}>➕ สร้างกระเป๋าเงินใหม่</button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab}>
                        {activeTab === 'overview' && (
                            <div style={overviewGrid}>
                                <div style={balanceCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ fontWeight: '800', color: '#fff' }}>ยอดเงินคงเหลือ</p>
                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => fetchData(user.wallet_address, true)} style={iconRefreshBtnStyle}>
                                            <span className={isRefreshing ? "spinning" : ""} style={{ display: 'inline-block', fontSize: '20px', color: '#fff' }}>🔄</span>
                                        </motion.button>
                                    </div>
                                    <h1 style={{ fontSize: '56px', fontWeight: '800', margin: '15px 0', color: '#fff' }}>{balance} <span style={{ fontSize: '24px', opacity: 0.8 }}>OERC</span></h1>
                                </div>
                                <div style={statusCard}>
                                    <p style={{ fontWeight: '800', marginBottom: '15px' }}>QR Code รับเงิน</p>
                                    <div style={{ background: '#fff', padding: '15px', borderRadius: '20px', display: 'inline-block', border: '1px solid #EEE' }}>
                                        {user?.wallet_address && <QRCodeCanvas value={user.wallet_address} size={150} />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transfer' && (
                            <div style={cardContainer}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '22px', fontWeight: '800' }}>ส่งเหรียญ</h3>
                                    <button onClick={() => setShowScanner(true)} style={scanBtnStyle}>📷 สแกน QR</button>
                                </div>
                                <label style={labelStyle}>ที่อยู่ผู้รับ</label>
                                <input placeholder="0x..." value={walletInfo.to} onChange={e => setWalletInfo({ ...walletInfo, to: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>จำนวน</label>
                                <input type="number" placeholder="0.00" value={walletInfo.amount} onChange={e => setWalletInfo({ ...walletInfo, amount: e.target.value })} style={inputStyle} />
                                <button onClick={handleTransfer} style={primaryBtnStyle}><span style={{ color: '#fff' }}>ยืนยันการโอน</span></button>

                                {showScanner && (
                                    <div style={scannerOverlayStyle}>
                                        <div style={scannerContentStyle}>
                                            <button onClick={() => setShowScanner(false)} style={{ float: 'right', background: 'none', fontSize: '24px' }}>×</button>
                                            <h3 style={{ fontWeight: '800', marginBottom: '15px' }}>สแกนที่อยู่ผู้รับ</h3>
                                            <div id="reader"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div style={cardContainer}>
                                <h3 style={{ marginBottom: '25px', fontSize: '22px', fontWeight: '800' }}>ประวัติธุรกรรม</h3>
                                {transactions.map((tx, i) => {
                                    const isSent = tx.from?.toLowerCase() === user?.wallet_address?.toLowerCase();
                                    // สร้าง URL สำหรับตรวจสอบบน Etherscan
                                    const etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;

                                    return (
                                        <div key={i} style={{ position: 'relative', marginBottom: '15px' }}>
                                            <div style={txCardStyle}>
                                                <div style={{ ...iconCircle, background: isSent ? '#FFF5F5' : '#F0FFF4' }}>{isSent ? '📤' : '📥'}</div>
                                                <div style={{ flex: 1, marginLeft: '15px' }}>
                                                    <p style={{ fontWeight: '800' }}>{isSent ? 'ส่งออก' : 'รับเข้า'}</p>
                                                    <p style={{ fontSize: '12px', color: '#666' }}>{new Date(tx.timeStamp * 1000).toLocaleString()}</p>
                                                </div>
                                                <div style={{ textAlign: 'right', marginRight: '15px' }}>
                                                    <p style={{ fontWeight: '800', fontSize: '18px', color: isSent ? '#E53E3E' : '#38A169' }}>
                                                        {isSent ? '-' : '+'} {ethers.utils.formatUnits(tx.value || '0', 18)}
                                                    </p>
                                                </div>
                                                {/* เพิ่มปุ่มลิงค์ไป Etherscan */}
                                                <a
                                                    href={etherscanUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={viewDetailsBtnStyle}
                                                    title="ดูบน Etherscan"
                                                >
                                                    🔗
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Styles ---
const sidebarStyle = { width: '280px', background: '#fff', padding: '40px 0', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' };
const loginContainerStyle = { display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' };
const loginCardStyle = { padding: '50px 40px', background: '#fff', borderRadius: '40px', width: '450px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '18px', marginBottom: '15px', borderRadius: '18px', border: '2px solid #E2E8F0', background: '#F8FAFC', fontWeight: '800' };
const primaryBtnStyle = { width: '100%', padding: '18px', background: '#4A90E2', border: 'none', borderRadius: '18px', cursor: 'pointer', fontWeight: '800' };
const walletBadgeStyle = { background: '#fff', padding: '12px 25px', borderRadius: '50px', border: '2px solid #E2E8F0', cursor: 'pointer' };
const genBtnStyle = { padding: '12px 25px', background: '#38A169', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', maxWidth: '1100px', margin: '0 auto 50px auto' };
const toggleLinkStyle = { color: '#4A90E2', marginTop: '25px', cursor: 'pointer', fontWeight: '800' };
const logoutBtnStyle = { margin: '0 20px', padding: '16px', background: '#FFF5F5', color: '#C53030', border: 'none', borderRadius: '15px', fontWeight: '800' };
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', maxWidth: '1100px', margin: '0 auto' };
const balanceCard = { background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', padding: '40px', borderRadius: '35px' };
const statusCard = { background: '#fff', padding: '40px', borderRadius: '35px', border: '1px solid #E2E8F0', textAlign: 'center' };
const cardContainer = { background: '#fff', padding: '40px', borderRadius: '35px', border: '1px solid #E2E8F0', maxWidth: '900px', margin: '0 auto' };
const labelStyle = { display: 'block', marginBottom: '10px', fontWeight: '800', color: '#000' };
const iconRefreshBtnStyle = { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const scanBtnStyle = { padding: '10px 20px', background: '#F0F4F8', border: 'none', borderRadius: '12px', color: '#4A90E2', fontWeight: '800' };
const scannerOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const scannerContentStyle = { background: '#fff', padding: '25px', borderRadius: '30px', width: '90%', maxWidth: '500px' };
const txCardStyle = { display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '22px', background: '#fff', border: '1px solid #F0F4F8', marginBottom: '15px' };
const iconCircle = { width: '55px', height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' };

const SidebarItem = ({ active, label, icon, onClick }) => (
    <div onClick={onClick} style={{ margin: '0 15px 8px 15px', padding: '16px 20px', cursor: 'pointer', borderRadius: '18px', background: active ? '#4A90E2' : 'transparent', color: active ? '#fff' : '#000', fontWeight: '800', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <span style={{ fontSize: '20px', color: active ? '#fff' : '#000' }}>{icon}</span> {label}
    </div>
);

export default App;