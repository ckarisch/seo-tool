'use client';

import React, { useEffect, useState } from 'react';
import styles from './Logs.module.css';
import { AdminLog } from '@prisma/client';
import { format } from 'date-fns';
import { visibleDateFormat } from '@/config/config';

interface AdminLogs {
    adminLogs: AdminLog[]
}

const Logs = () => {
    const [logs, setLogs] = useState<AdminLogs>({ adminLogs: [] });

    useEffect(() => {
        fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/api/admin/adminLogs/')
            .then(res => res.json())
            .then(data => setLogs(data));
    }, []);

    return (
        <div className={styles.logsContainer}>
            <h1>Admin Logs <span className={styles.logIcon}>📝</span></h1>
            <div className={styles.logsList}>
                {logs.adminLogs.map((log, index) => (
                    <div key={index} className={styles.logEntry}>
                        <p className={styles.logMessage}>{log.message}</p>
                        <p className={styles.logDate}>{format(log.createdAt, visibleDateFormat)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Logs;