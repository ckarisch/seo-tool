"use client";

import { ChangeEventHandler } from "react";


export default function Toggle(params: { loading: boolean, checked: boolean, onChange: ChangeEventHandler<HTMLInputElement>, label: string }) {
    return (
        <div>
            {
                !params.loading ?
                    <input disabled={params.loading} type="checkbox" checked={params.checked} onChange={params.onChange} />
                    : '...'
            }
            {params.label}
        </div>
    );
}
