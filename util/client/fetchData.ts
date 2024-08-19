

export const fetchData = async (endpoint: string, fetchTag: string, setData: Function | null, callback: Function | null) => {
    return fetch(process.env.NEXT_PUBLIC_API_DOMAIN + '/' + endpoint,
        { next: { tags: [fetchTag] } })
        .then(res => res.json())
        .then(data => { setData && setData(data); callback && callback() });
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';