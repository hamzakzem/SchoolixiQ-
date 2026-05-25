import React, { forwardRef } from "react";
import StudentCard from "./StudentCard";

import { IdCardTemplate } from "../../../types/idCardTemplate";

interface StudentCardPrintProps {
  student: any;
  cardData: any;
  isRtl?: boolean;
  template?: IdCardTemplate | null;
}

const StudentCardPrint = forwardRef<HTMLDivElement, StudentCardPrintProps>(
  ({ student, cardData, isRtl, template }, ref) => {
    if (!student || !cardData) {
      return <div ref={ref} className="hidden" />;
    }
    
    return (
      <div ref={ref} className="p-4 bg-white inline-block w-max">
        <StudentCard student={student} cardData={cardData} isRtl={isRtl} template={template} />
      </div>
    );
  },
);

StudentCardPrint.displayName = "StudentCardPrint";

export default StudentCardPrint;
