interface YatraStatusBadgeProps {
    status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    open: { label: 'Open', className: 'bg-green-100 text-green-700' },
    full: { label: 'Full', className: 'bg-yellow-100 text-yellow-700' },
    active: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', className: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

export function YatraStatusBadge({ status }: YatraStatusBadgeProps) {
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}
