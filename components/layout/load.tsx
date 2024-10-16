import { Loading } from "@/icons/loading"

export const Load = ({ loading, children }: {
    loading: boolean,
    children: Readonly<React.ReactNode>
}) => {
    if (loading)
        return <Loading width={16} height={16}/>
    else
        return <>{children}</>
}