import { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    children: React.ReactNode;
    required?: boolean;
}

const Label = ({ children,required, ...props }: LabelProps) => {
    return (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">
            {children}
            {required && <span className="text-red-700 ml-1">*</span>}
          </label>
        </div>
    );
};

export default Label;