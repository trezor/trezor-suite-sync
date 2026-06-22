export const toMetricNumber = (value: string | number | bigint | null | undefined): number =>
    Number(value ?? 0);
