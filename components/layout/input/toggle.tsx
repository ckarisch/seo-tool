"use client";

import { Loading } from "@/icons/loading";
import { ChangeEventHandler } from "react";
import styles from "./toggle.module.scss";


export default function Toggle(params: { loading: boolean, checked: boolean, onChange: ChangeEventHandler<HTMLInputElement>, label: string }) {
    return (
        <div className={styles.toggle}>
            {
                !params.loading ?
                    <input disabled={params.loading} type="checkbox" checked={params.checked} onChange={params.onChange} />
                    : <Loading width={16} height={16}/>
            }
            {params.label}
        </div>
    );
}
