import React, { forwardRef } from "react";
import StudentCard from "./StudentCard";
import StudentCardBack from "./StudentCardBack";

import { IdCardTemplate } from "../../../types/idCardTemplate";

interface StudentGridPrintProps {
  students: any[];
  idCards: Record<string, any>;
  isRtl?: boolean;
  template?: IdCardTemplate | null;
  printSides?: "front" | "back" | "both";
  copies?: number;
  layoutMode?: "a4" | "pvc";
}

const StudentGridPrint = forwardRef<HTMLDivElement, StudentGridPrintProps>(
  ({ students, idCards, isRtl, template, printSides = "front", copies = 1, layoutMode = "a4" }, ref) => {
    
    // We expand the array based on copies
    const cardsToPrint = [];
    for (const student of students) {
       for(let i=0; i<copies; i++) {
          cardsToPrint.push(student);
       }
    }

    // In A4 Mode, we could print Fronts on one page, Backs on the next, 
    // OR interleaving Fronts and Backs (if duplex printer). Usually, duplex PVC prints sequentially: Front, Back, Front, Back.
    // Let's implement Front-Back adjacency for PVC direct printing, 
    // and for A4, normally we'd do Fronts for the whole grid, then Backs for the whole grid, but standardizing it as sequential inside the grid is also fine unless specific imposing is demanded.
    // Let's just output them as physical cards sequentially. So Front, Back, Front, Back.
    return (
      <div ref={ref} className={`w-full custom-print-container ${layoutMode === 'a4' ? 'max-w-[210mm] mx-auto bg-white p-[6mm]' : ''}`}>
        <style>{`
          @media print {
            .custom-print-container .pvc-mode > div {
              page-break-after: always;
              break-after: page;
            }
          }
        `}</style>
        <div className={`flex flex-wrap items-center justify-start ${layoutMode === 'a4' ? 'gap-x-[6mm] gap-y-[8mm]' : ''} ${layoutMode === 'pvc' ? 'pvc-mode' : ''}`}>
          {cardsToPrint.map((student, idx) => {
            const cardData = idCards[student.id];
            if (!cardData) return null;
            return (
              <React.Fragment key={`${student.id}-${idx}`}>
                {(printSides === "front" || printSides === "both") && (
                  <div
                    className="break-inside-avoid page-break-inside-avoid w-max"
                    style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                  >
                    <StudentCard
                      student={student}
                      cardData={cardData}
                      isRtl={isRtl}
                      template={template}
                    />
                  </div>
                )}
                {(printSides === "back" || printSides === "both") && (
                   <div
                     className="break-inside-avoid page-break-inside-avoid w-max"
                     style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                   >
                     <StudentCardBack
                       student={student}
                       cardData={cardData}
                       isRtl={isRtl}
                       template={template}
                     />
                   </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  },
);

StudentGridPrint.displayName = "StudentGridPrint";

export default StudentGridPrint;

