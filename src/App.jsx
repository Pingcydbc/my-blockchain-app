import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        html, body, #root { width: 100%; height: 100%; background: #F7FAFC; overflow: hidden; }
        input { color: #000 !important; font-size: 16px !important; font-weight: 800 !important; }
        button { font-weight: 800 !important; }
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

    const CONTRACT_OERC = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";
    const API_BASE = "https://my-blockchain-app-back.vercel.app";

    useEffect(() => {
        const savedUser = localStorage.getItem('oerc_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
            setView('dashboard');
        }
    }, []);

    const fetchData = useCallback(async (address) => {
        try {
            // ... โค้ดดึงยอดเงินคงเดิม ...
            const res = await axios.get(`${API_BASE}/transactions?address=${address}`);

            // ป้องกันค่า undefined ด้วยการใส่ [] สำรองไว้
            if (res.data && res.data.success) {
                setTransactions(res.data.transactions || []);
            } else {
                setTransactions([]);
            }
        } catch (e) {
            console.error("Data Fetch Error:", e);
            setTransactions([]);
        }
    }, [API_BASE]);

    useEffect(() => {
        if (user && user.wallet_address) {
            fetchData(user.wallet_address);
        }
    }, [user, fetchData, activeTab]);

    const handleGenerateWallet = async () => {
        Swal.fire({
            title: 'กำลังสร้างกระเป๋า...',
            text: 'กรุณารอสักครู่ ระบบกำลังบันทึกข้อมูลลงบล็อกเชน',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await axios.post(`${API_BASE}/generate-wallet`, { username: user.username });
            if (res.data.address) {
                const updatedUser = { ...user, wallet_address: res.data.address };
                localStorage.setItem('oerc_user', JSON.stringify(updatedUser));
                setUser(updatedUser);

                Swal.fire({
                    icon: 'success',
                    title: 'สร้างกระเป๋าสำเร็จ!',
                    text: 'กำลังรีโหลดหน้าจอเพื่ออัปเดตข้อมูล...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            }
        } catch (e) {
            Swal.close();
            Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างกระเป๋า', 'error');
        }
    };

    const handleLogin = async () => {
        try {
            const res = await axios.post(`${API_BASE}/login`, formData);
            localStorage.setItem('oerc_user', JSON.stringify(res.data));
            setUser(res.data);
            setView('dashboard');
            Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('ผิดพลาด', 'Login ไม่สำเร็จ', 'error'); }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'ยืนยันการออกจากระบบ?',
            text: "คุณจะต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง",
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
                Swal.fire({ icon: 'success', title: 'ออกจากระบบแล้ว', showConfirmButton: false, timer: 1000 });
            }
        });
    };

    const handleRegister = async () => {
        try {
            await axios.post(`${API_BASE}/register`, formData);
            Swal.fire('สำเร็จ', 'สมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ', 'success');
            setIsRegistering(false);
        } catch (e) { Swal.fire('ผิดพลาด', 'สมัครสมาชิกไม่สำเร็จ', 'error'); }
    };

    const handleTransfer = async () => {
        if (!walletInfo.to || !walletInfo.amount) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        Swal.fire({ title: 'กำลังส่งเหรียญ...', didOpen: () => Swal.showLoading() });
        try {
            await axios.post(`${API_BASE}/transfer`, {
                fromUsername: user.username,
                toAddress: walletInfo.to,
                amount: walletInfo.amount
            });
            Swal.fire('สำเร็จ!', 'โอนเหรียญเรียบร้อย', 'success');
            fetchData(user.wallet_address);
        } catch (e) { Swal.fire('ล้มเหลว', 'โอนไม่สำเร็จ', 'error'); }
    };

    if (view === 'login') {
        return (
            <div style={loginContainerStyle}>
                <GlobalStyles />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={loginCardStyle}>
                    <h1 style={{ color: '#000', fontWeight: '800', fontSize: '36px' }}>OERC</h1>
                    <p style={{ color: '#000', margin: '20px 0', fontWeight: '800' }}>
                        {isRegistering ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ IT-CMTC'}
                    </p>
                    <input placeholder="Username" onChange={e => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
                    <input type="password" placeholder="Password" onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
                    <button onClick={isRegistering ? handleRegister : handleLogin} style={primaryBtnStyle}>
                        {isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </button>
                    <p onClick={() => setIsRegistering(!isRegistering)} style={toggleLinkStyle}>
                        {isRegistering ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <GlobalStyles />
            <div style={sidebarStyle}>
                <h2 style={{ color: '#000', fontWeight: '800', marginBottom: '40px', textAlign: 'center' }}>🏦 IT-CMTC</h2>
                <div style={{ flex: 1 }}>
                    <SidebarItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="หน้าหลัก" icon="🏠" />
                    <SidebarItem active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} label="โอนเหรียญ" icon="💸" />
                    <SidebarItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="ประวัติธุรกรรม" icon="📜" />
                </div>
                <button onClick={handleLogout} style={logoutBtnStyle}>ออกจากระบบ</button>
            </div>

            <div style={{ flex: 1, padding: '40px', background: '#F7FAFC', overflowY: 'auto' }}>
                <div style={headerStyle}>
                    <h2 style={{ color: '#000', fontWeight: '800', fontSize: '28px' }}>สวัสดี, {user?.username}</h2>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {user?.wallet_address ? (
                            <div onClick={() => { navigator.clipboard.writeText(user.wallet_address); Swal.fire({ icon: 'success', title: 'คัดลอกแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }); }} style={walletBadgeStyle}>
                                <span style={{ color: '#000', fontWeight: '800' }}>
                                    📍 {user.wallet_address.substring(0, 8)}...{user.wallet_address.slice(-4)}
                                </span>
                            </div>
                        ) : (
                            <button onClick={handleGenerateWallet} style={genBtnStyle}>➕ สร้างกระเป๋าเงินใหม่</button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        {activeTab === 'overview' && (
                            <div style={overviewGrid}>
                                <div style={balanceCard}>
                                    <p style={{ fontWeight: '800', fontSize: '18px' }}>ยอดเงินคงเหลือ</p>
                                    <h1 style={{ fontSize: '56px', fontWeight: '800' }}>{balance} <span style={{ fontSize: '24px' }}>OERC</span></h1>
                                </div>
                                <div style={statusCard}>
                                    <p style={{ fontWeight: '800', color: '#000' }}>สถานะระบบ</p>
                                    <h2 style={{ color: '#38A169', fontWeight: '800', marginTop: '10px' }}>● เชื่อมต่อสำเร็จ</h2>
                                    <p style={{ color: '#666', marginTop: '5px', fontWeight: '800' }}>Network: Sepolia Testnet</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transfer' && (
                            <div style={cardContainer}>
                                <h3 style={{ color: '#000', marginBottom: '25px', fontSize: '22px', fontWeight: '800' }}>โอนเหรียญ OERC</h3>
                                <label style={labelStyle}>เลขกระเป๋าผู้รับ</label>
                                <input placeholder="0x..." onChange={e => setWalletInfo({ ...walletInfo, to: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>จำนวนเหรียญ</label>
                                <input type="number" placeholder="0.00" onChange={e => setWalletInfo({ ...walletInfo, amount: e.target.value })} style={inputStyle} />
                                <button onClick={handleTransfer} style={primaryBtnStyle}>ยืนยันการโอน</button>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div style={cardContainer}>
                                <h3 style={{ color: '#000', marginBottom: '25px', fontSize: '22px', fontWeight: '800' }}>ประวัติธุรกรรม</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #EEE', color: '#000' }}>
                                            <th style={{ padding: '15px', fontWeight: '800' }}>ประเภท</th>
                                            <th style={{ padding: '15px', fontWeight: '800' }}>จำนวน</th>
                                            <th style={{ padding: '15px', fontWeight: '800' }}>รายละเอียด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* ใช้ Optional Chaining และตรวจสอบความยาวของ Array */}
                                        {transactions?.length > 0 ? (
                                            transactions.map((tx, i) => {
                                                const isSent = tx.from?.toLowerCase() === user?.wallet_address?.toLowerCase();
                                                const color = isSent ? '#E53E3E' : '#38A169';

                                                // Etherscan มักใช้ชื่อฟิลด์เหล่านี้: value, tokenDecimal, tokenSymbol
                                                const displayValue = tx.value ? ethers.utils.formatUnits(tx.value, tx.tokenDecimal || 18) : "0";

                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid #F5F5F5' }}>
                                                        <td style={{ padding: '15px', fontWeight: '800', color: color }}>
                                                            {isSent ? '📤 ส่งออก' : '📥 รับเข้า'}
                                                        </td>
                                                        <td style={{ padding: '15px', fontWeight: '800', color: color }}>
                                                            {isSent ? '-' : '+'} {displayValue} {tx.tokenSymbol || 'OERC'}
                                                        </td>
                                                        <td style={{ padding: '15px' }}>
                                                            <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#4A90E2', textDecoration: 'none', fontWeight: '800' }}>
                                                                🌐 Etherscan
                                                            </a>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="3" style={{ padding: '30px', textAlign: 'center', fontWeight: '800', color: '#666' }}>
                                                    ไม่พบรายการธุรกรรม
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// --- Styles ---
const sidebarStyle = { width: '280px', background: '#fff', padding: '40px 20px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' };
const loginContainerStyle = { display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' };
const loginCardStyle = { padding: '40px', background: '#fff', borderRadius: '30px', width: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '16px', marginBottom: '15px', borderRadius: '15px', border: '2px solid #E2E8F0', background: '#F8FAFC', fontWeight: '800' };
const primaryBtnStyle = { width: '100%', padding: '16px', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '16px', cursor: 'pointer', fontWeight: '800' };
const walletBadgeStyle = { background: '#fff', padding: '12px 20px', borderRadius: '50px', border: '2px solid #E2E8F0', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const genBtnStyle = { padding: '12px 25px', background: '#38A169', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(56, 161, 105, 0.3)', fontWeight: '800' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', maxWidth: '1100px', margin: '0 auto 50px auto' };
const toggleLinkStyle = { color: '#4A90E2', marginTop: '20px', cursor: 'pointer', fontWeight: '800' };
const logoutBtnStyle = { padding: '16px', background: '#FFF5F5', color: '#C53030', border: 'none', borderRadius: '15px', cursor: 'pointer', marginTop: 'auto', fontWeight: '800' };
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', maxWidth: '1100px', margin: '0 auto' };
const balanceCard = { background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', padding: '40px', borderRadius: '30px', color: '#fff', boxShadow: '0 15px 30px rgba(74, 144, 226, 0.2)' };
const statusCard = { background: '#fff', padding: '40px', borderRadius: '30px', border: '1px solid #E2E8F0' };
const cardContainer = { background: '#fff', padding: '40px', borderRadius: '30px', border: '1px solid #E2E8F0', maxWidth: '900px', margin: '0 auto' };
const labelStyle = { display: 'block', marginBottom: '10px', color: '#000', fontWeight: '800', fontSize: '14px' };

const SidebarItem = ({ active, label, icon, onClick }) => (
    <div onClick={onClick} style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '15px', background: active ? '#4A90E2' : 'transparent', color: active ? '#fff' : '#000', fontWeight: '800', marginBottom: '10px', display: 'flex', gap: '12px', transition: '0.2s' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span> {label}
    </div>
);

export default App;