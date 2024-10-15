import adminStyles from '@/app/admin/admin.module.scss';

export default async function Admin() {
    
    return (
        <>
            <div className={[adminStyles.element, adminStyles.heading].join(' ')}>
                <div>Name</div>
                <div>Unterseiten</div>
                <div>Score</div>
            </div>
        </ >
    )
}