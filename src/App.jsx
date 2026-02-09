import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';

// 1. ปรับปรุง Global Styles ให้ตัวหนังสือใน input เป็นสีดำเข้มทั้งหมด
const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        html, body, #root { width: 100%; height: 100%; background: #F7FAFC; overflow: hidden; }
        
        /* ตั้งค่าตัวหนังสือที่พิมพ์ลงใน input ให้เป็นสีดำเข้ม */
        input {
            color: #1A202C !important; /* สีดำเข้ม */
            font-size: 16px !important;
            font-weight: 500 !important;
        }

        input::placeholder {
            color: #A0AEC0 !important; /* สีเทาเฉพาะตัวหนังสือที่ยังไม่ได้พิมพ์ */
        }

        input:focus {
            border-color: #4A90E2 !important;
            background: #ffffff !important;
            box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.1) !important;
            outline: none;
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E0; border-radius: 10px; }
    `}</style>
);

function App() {
    const [view, setView] = useState('login');
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [walletInfo, setWalletInfo] = useState({ to: '', amount: '' });
    const [balance, setBalance] = useState('0');
    const [transactions, setTransactions] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    const CONTRACT_OERC = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";

    const copyToClipboard = (text, title = "คัดลอกแล้ว") => {
        navigator.clipboard.writeText(text);
        Swal.fire({ icon: 'success', title: title, toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
    };

    const getBalance = async (address) => {
        try {
            const provider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
            const abi = ["function balanceOf(address owner) view returns (uint256)"];
            const contract = new ethers.Contract(CONTRACT_OERC, abi, provider);
            const rawBalance = await contract.balanceOf(address);
            setBalance(ethers.utils.formatUnits(rawBalance, 18));
        } catch (e) { console.error(e); }
    };

    const fetchTransactions = async (address) => {
        try {
            const res = await axios.get(`https://my-blockchain-app-back.vercel.app/transactions?address=${address}`);
            if (res.data.success) setTransactions(res.data.transactions);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (user && user.wallet_address) {
            getBalance(user.wallet_address);
            fetchTransactions(user.wallet_address);
        }
    }, [user]);

    const handleLogin = async () => {
        try {
            const res = await axios.post('https://my-blockchain-app-back.vercel.app/login', formData);
            setUser(res.data);
            setView('dashboard');
            Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', showConfirmButton: false, timer: 1500 });
        } catch (e) { Swal.fire('ผิดพลาด', 'Login ไม่สำเร็จ', 'error'); }
    };

    const handleTransfer = async () => {
        if (!walletInfo.to || !walletInfo.amount) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
        Swal.fire({ title: 'กำลังส่งเหรียญ...', didOpen: () => Swal.showLoading() });
        try {
            await axios.post('https://my-blockchain-app-back.vercel.app/transfer', {
                fromUsername: user.username,
                toAddress: walletInfo.to,
                amount: walletInfo.amount
            });
            Swal.fire('สำเร็จ!', 'ธุรกรรมถูกส่งแล้ว', 'success');
            getBalance(user.wallet_address);
            fetchTransactions(user.wallet_address);
        } catch (e) { Swal.fire('ล้มเหลว', e.response?.data?.error || e.message, 'error'); }
    };

    const SidebarItem = ({ id, label, icon }) => (
        <div 
            onClick={() => setActiveTab(id)}
            style={{
                padding: '16px 20px', cursor: 'pointer', borderRadius: '14px', marginBottom: '8px',
                background: activeTab === id ? '#4A90E2' : 'transparent',
                color: activeTab === id ? '#fff' : '#718096',
                transition: '0.2s all', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px'
            }}
        >
            <span style={{ fontSize: '20px' }}>{icon}</span> {label}
        </div>
    );

    if (view === 'login') {
        return (
            <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
                <GlobalStyles />
                <div style={{ width: '100%', maxWidth: '420px', padding: '40px', background: '#fff', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                    <h1 style={{ color: '#1A202C', marginBottom: '8px', fontSize: '32px', fontWeight: '700' }}>OERC</h1>
                    <p style={{ color: '#718096', marginBottom: '35px' }}>เข้าสู่ระบบจัดการกระเป๋า</p>
                    <input placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} style={inputBaseStyle} />
                    <input type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} style={inputBaseStyle} />
                    <button onClick={handleLogin} style={primaryBtnStyle}>Sign In</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <GlobalStyles />
            <div style={{ width: '280px', minWidth: '280px', background: '#fff', borderRight: '1px solid #E2E8F0', padding: '40px 20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ color: '#2D3748', marginBottom: '45px', textAlign: 'center', fontWeight: '700' }}>🏦 IT-CMTC</h2>
                <div style={{ flex: 1 }}>
                    <SidebarItem id="overview" label="หน้าหลัก" icon="🏠" />
                    <SidebarItem id="transfer" label="โอนเหรียญ" icon="💸" />
                    <SidebarItem id="history" label="ประวัติธุรกรรม" icon="📜" />
                </div>
                <button onClick={() => setView('login')} style={{ border: 'none', background: '#FFF5F5', color: '#C53030', padding: '16px', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' }}>ออกจากระบบ</button>
            </div>

            <div style={{ flex: 1, height: '100vh', padding: '40px', overflowY: 'auto', background: '#F7FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', maxWidth: '1100px', margin: '0 auto 40px auto' }}>
                    <h2 style={{ color: '#1A202C', fontSize: '26px' }}>สวัสดี, {user?.username}</h2>
                    <div onClick={() => copyToClipboard(user.wallet_address, "คัดลอกที่อยู่แล้ว")} style={{ background: '#fff', padding: '12px 24px', borderRadius: '50px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', fontSize: '14px', color: '#4A5568', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '600' }}>📍 {user?.wallet_address.substring(0, 10)}...{user?.wallet_address.slice(-6)}</span>
                        <span style={{ color: '#4A90E2' }}>📄</span>
                    </div>
                </div>

                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', color: '#fff' }}>
                                <p style={{ opacity: 0.9 }}>ยอดเงินทั้งหมด</p>
                                <h1 style={{ fontSize: '48px', margin: '15px 0', fontWeight: '700' }}>{balance} <span style={{ fontSize: '20px' }}>OERC</span></h1>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ color: '#718096', fontWeight: '600' }}>สถานะกระเป๋า</p>
                                <h2 style={{ color: '#48BB78', margin: '15px 0' }}>● ออนไลน์ (Sepolia)</h2>
                                <p style={{ fontSize: '12px', color: '#A0AEC0' }}>Contract: {CONTRACT_OERC}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transfer' && (
                        <div style={{ ...cardStyle, maxWidth: '600px', margin: '0 auto', borderTop: '6px solid #4A90E2' }}>
                            <h3 style={{ fontSize: '24px', color: '#2D3748', marginBottom: '25px', textAlign: 'center' }}>โอนเหรียญ OERC</h3>
                            
                            <label style={labelStyle}>👤 เลขกระเป๋าผู้รับ</label>
                            <input placeholder="0x..." onChange={e => setWalletInfo({...walletInfo, to: e.target.value})} style={inputBaseStyle} />

                            <label style={labelStyle}>💰 จำนวนเหรียญ</label>
                            <div style={{ position: 'relative' }}>
                                <input type="number" placeholder="0.00" onChange={e => setWalletInfo({...walletInfo, amount: e.target.value})} style={{ ...inputBaseStyle, paddingRight: '70px' }} />
                                <span style={{ position: 'absolute', right: '20px', top: '16px', fontWeight: 'bold', color: '#4A90E2' }}>OERC</span>
                            </div>

                            <button onClick={handleTransfer} style={primaryBtnStyle}>ยืนยันการโอน</button>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: '30px' }}>ประวัติการทำรายการ</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #F7FAFC', color: '#A0AEC0' }}>
                                        <th style={{ padding: '18px' }}>สถานะ</th>
                                        <th style={{ padding: '18px' }}>จำนวน</th>
                                        <th style={{ padding: '18px' }}>ลิงก์</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #F7FAFC' }}>
                                            <td style={{ padding: '18px', fontWeight: '700', color: tx.from.toLowerCase() === user.wallet_address.toLowerCase() ? '#E53E3E' : '#38A169' }}>
                                                {tx.from.toLowerCase() === user.wallet_address.toLowerCase() ? '📤 ส่งออก' : '📥 ได้รับ'}
                                            </td>
                                            <td style={{ padding: '18px', fontWeight: '700' , color: tx.from.toLowerCase() === user.wallet_address.toLowerCase() ? '#E53E3E' : '#38A169' }}>{ethers.utils.formatUnits(tx.value, 18)} {tx.coinSymbol || 'OERC'}</td>
                                            <td style={{ padding: '18px' }}>
                                                <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#4A90E2', textDecoration: 'none' }}>🌐 Etherscan</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const cardStyle = { background: '#fff', padding: '35px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #F1F4F8' };
const inputBaseStyle = { width: '100%', padding: '16px 20px', marginBottom: '20px', borderRadius: '16px', border: '2px solid #F1F5F9', outline: 'none', background: '#F8FAFC', fontSize: '16px' };
const primaryBtnStyle = { width: '100%', padding: '18px', background: '#4A90E2', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', fontSize: '16px', boxShadow: '0 8px 20px rgba(74, 144, 226, 0.25)' };
const labelStyle = { display: 'block', marginBottom: '10px', color: '#4A5568', fontWeight: '700', fontSize: '14px' };

export default App;