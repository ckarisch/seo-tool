"use client";

import adminStyles from '@/app/admin/admin.module.scss';

export default function LoadingList() {
    return (
        <>
            <div className={[adminStyles.element, adminStyles.heading].join(' ')}>
                <div>Laden...</div>
                <div></div>
                <div></div>
            </div>
            <div className={[adminStyles.element].join(' ')}>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div className={[adminStyles.element].join(' ')}>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div className={[adminStyles.element].join(' ')}>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </ >
    )
}
