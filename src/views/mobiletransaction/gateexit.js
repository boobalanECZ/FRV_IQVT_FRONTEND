import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaInfoCircle, FaFileInvoice } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import scanInvoiceImg from '../../assets/images/scaninvoice.png';
import API from '../../api';
import '../../assets/CSS/scaninvoice.css';
const GateExit = () => {
    const scanRef = useRef(null);
    const isProcessing = useRef(false);
    const lastInvoiceRef = useRef('');
    const navigate = useNavigate();
    const [scannedData, setScannedData] = useState(null);
    useEffect(() => {
        scanRef.current?.focus();
    }, []);

    const extractInvoiceNo = (raw) => {
        const clean = raw.replace(/[\r\n\t\u001D\u001E\u001C]/g, ' ').trim();
        const primaryMatch = clean.match(/107\d{7}/);
        if (primaryMatch) return primaryMatch[0];
        const tokens = clean.split(/\s+/).filter(Boolean);
        const numToken = tokens.find(t => /^\d{9,10}$/.test(t));
        return numToken || null;
    };

    const processBarcode = async (raw) => {
        if (isProcessing.current) return;
        const invoiceNo = extractInvoiceNo(raw);
        if (!invoiceNo) {
            console.warn('Invoice not found in barcode');
            scanRef.current?.focus();
            return;
        }

        if (lastInvoiceRef.current === invoiceNo) {
            return;
        }

        lastInvoiceRef.current = invoiceNo;
        isProcessing.current = true;
        if (scanRef.current) {
            scanRef.current.value = '';
        }

        try {
            const user = JSON.parse(
                sessionStorage.getItem('user') || '{}'
            );
            const res = await API.post('/gateexit/scan', {
                invoiceNo,
                userId: user.id ?? 0
            });

            setScannedData({
                invoiceNo: res.data?.invoiceNo || '',
                despatchId: res.data?.despatchId || '',
                customerName: res.data?.customerName || '',
                totalQty: res.data?.totalQty || 0,
                exitTime: res.data?.exitTime || ''
            });

            toast.success(
                res.data.message || 'Gate Exit recorded'
            );

            setTimeout(() => {
                navigate('/mobiletransaction/ScanInvoice');
            }, 2000);
        } catch (err) {
            const msg = err?.response?.data;

            toast.error(
                typeof msg === 'string'
                    ? msg
                    : 'Scan failed. Try again.'
            );
        } finally {
            isProcessing.current = false;
            setTimeout(() => {
                lastInvoiceRef.current = '';
            }, 2000);
            scanRef.current?.focus();
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        if (value.length > 50 && !isProcessing.current
        ) {
            processBarcode(value);
        }
    };

    return (
        <div className="scan-container">

            <div className="scan-header">
                <div>
                    <h3>GATE EXIT</h3>
                    <p>Scan and verify Invoice</p>
                </div>
                <div
                    className="mobility-back-icon"
                    onClick={() => navigate(-1)}
                    title="Back"
                >
                    <FaArrowLeft />
                </div>
            </div>

            <div className="scan-body">
                <div
                    className="scanner-box"
                    onClick={() => scanRef.current?.focus()}
                >
                    <img
                        src={scanInvoiceImg}
                        alt="Gate Exit Scan"
                        className="scanner-image"
                    />
                    <input
                        ref={scanRef}
                        type="text"
                        className="scanner-input"
                        autoFocus
                        onBlur={() =>
                            setTimeout(
                                () => scanRef.current?.focus(),
                                150
                            )
                        }
                        onChange={handleChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
                    />
                    <div className="scan-cursor" />
                </div>

                <div className="info-box">
                    <FaInfoCircle className="info-icon" />
                    <span>
                        Scan the Invoice for Gate Exit
                    </span>
                </div>


                {scannedData && (
                    <div style={{ maxWidth: '100%', marginTop: '20px' }}>

                        {/* Card Header */}
                        <div style={{
                            background: '#0b43b5',
                            padding: '1.25rem 1.5rem',
                            borderRadius: '12px 12px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 8,
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FaFileInvoice color="#fff" size={18} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gate Exit — Scanned</p>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#fff' }}>Invoice Details</p>
                            </div>
                            <span style={{
                                marginLeft: 'auto', fontSize: 11,
                                background: 'rgba(255,255,255,0.18)', color: '#fff',
                                padding: '3px 10px', borderRadius: 99, fontWeight: 500
                            }}>✓ Verified</span>
                        </div>

                        {/* Card Body */}
                        <div style={{
                            background: '#fff',
                            border: '1px solid #e5eaf5',
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            overflow: 'hidden'
                        }}>
                            {/* Row 1 — Invoice + Dispatch */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #eef2f7' }}>
                                <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid #eef2f7' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888' }}>Invoice no</p>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#0b43b5', fontFamily: 'monospace' }}>{scannedData.invoiceNo}</p>
                                </div>
                                <div style={{ padding: '1rem 1.25rem' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888' }}>Dispatch ID</p>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#0b43b5', fontFamily: 'monospace' }}>{scannedData.despatchId}</p>
                                </div>
                            </div>

                            {/* Row 2 — Customer */}
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: '#dbe8ff', color: '#0b43b5',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 500, flexShrink: 0
                                }}>
                                    {scannedData.customerName?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>Customer</p>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111' }}>{scannedData.customerName}</p>
                                </div>
                            </div>

                            {/* Row 3 — Qty + Exit Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid #eef2f7' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888' }}>Total qty</p>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#0b43b5' }}>{scannedData.totalQty}</p>
                                </div>
                                <div style={{ padding: '1rem 1.25rem' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#888' }}>Exit time</p>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#111' }}>{scannedData.exitTime?.split(' ')[0]}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{scannedData.exitTime?.split(' ')[1]}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default GateExit;