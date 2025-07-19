import { createContext, use } from "react";
import type { CompatStatement } from "@mdn/browser-compat-data";

interface Feature {
  name: string;
  compat: CompatStatement;
  depth: number;
}

interface FeatureRowContextValue {
  feature: Feature;
}

const FeatureRowContext = createContext<FeatureRowContextValue | null>(null);

export function useFeatureRow() {
  const context = use(FeatureRowContext);
  if (!context) {
    throw new Error(
      "FeatureRow components must be used within CompatTable.FeatureRow",
    );
  }
  return context;
}

interface CompatTableFeatureRowProps {
  feature: Feature;
  children: React.ReactNode;
}

const CompatTableFeatureRow = ({
  ref,
  feature,
  children,
  ...props
}: CompatTableFeatureRowProps & {
  ref?: React.RefObject<HTMLTableRowElement | null>;
}) => {
  return (
    <FeatureRowContext value={{ feature }}>
      <tr ref={ref} data-compat-table-feature-row="" {...props}>
        {children}
      </tr>
    </FeatureRowContext>
  );
};

export { CompatTableFeatureRow };
