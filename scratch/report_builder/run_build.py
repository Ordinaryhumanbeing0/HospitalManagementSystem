"""Entry point to build c:\\HospitalManagementSystem\\Hospital_Management_System_Report.pdf."""

import json
from pathlib import Path

from build_report import BUILDER_DIR, ROOT, build_pdf
from report_content import build_front_page2_html, build_front_page4_html, build_full_html

DIAG_DIR = ROOT / "scratch" / "diagrams"

DIAGRAM_PATHS = {
    "arch": str(DIAG_DIR / "fig1_system_architecture.png"),
    "uc": str(DIAG_DIR / "fig2_use_cases.png"),
    "er": str(DIAG_DIR / "fig3_er_domain_class.png"),
    "book": str(DIAG_DIR / "fig4_concurrent_booking_sequence.png"),
    "auth": str(DIAG_DIR / "fig5_auth_rbac_flow.png"),
    "bill": str(DIAG_DIR / "fig6_billing_payment.png"),
    "gantt": str(DIAG_DIR / "fig7_project_plan_gantt.png"),
}

TOC_TARGETS = [
    ("lof", "LIST OF FIGURES Figure No."),
    ("lot", "LIST OF TABLES Table No."),
    ("loa", "LIST OF ABBREVIATIONS Abbreviation Meaning"),
    ("ch1", "Chapter 1 INTRODUCTION"),
    ("s1_1", "1.1 Introduction to Hospital Management System"),
    ("s1_2", "1.2 Aim"),
    ("s1_3", "1.3 Motivation"),
    ("s1_4", "1.4 Key Objectives"),
    ("ch2", "Chapter 2 LITERATURE SURVEY"),
    ("s2_1", "2.1 Literature Survey"),
    ("s2_2", "2.2 Gap Analysis"),
    ("s2_3", "2.3 Problem Statement"),
    ("ch3", "Chapter 3 PROJECT REQUIREMENT SPECIFICATIONS"),
    ("s3_1", "3.1 Introduction and Project Scope"),
    ("s3_2", "3.2 Functional Requirements"),
    ("s3_3", "3.3 External Interface Requirements"),
    ("s3_4", "3.4 System Requirements"),
    ("s3_5", "3.5 System Implementation Plan"),
    ("ch4", "Chapter 4 SYSTEM IMPLEMENTATION"),
    ("s4_1", "4.1 Proposed System Architecture"),
    ("s4_2", "4.2 Algorithm"),
    ("s4_3", "4.3 Methodologies"),
    ("ch5", "Chapter 5 COURSEWISE WORKING MODULES"),
    ("s5_1", "5.1 Worklet 1: Patient & User Management"),
    ("s5_2", "5.2 Worklet 2: Appointment Scheduling & EHR"),
    ("s5_3", "5.3 Worklet 3: Billing, Reports & System Administration"),
    ("ch6", "Chapter 6 TESTING"),
    ("s6_1", "6.1 Test Plan"),
    ("s6_2", "6.2 Test Cases"),
    ("s6_3", "6.3 Test Results"),
    ("ch7", "Chapter 7 OTHER SPECIFICATION"),
    ("s7_1", "7.1 Advantages"),
    ("s7_2", "7.2 Limitations"),
    ("s7_3", "7.3 Applications"),
    ("ch8", "Chapter 8 IMPLEMENTATION AND RESULT"),
    ("s8_1", "8.1 Methodology"),
    ("s8_2", "8.2 Results"),
    ("ch9", "Chapter 9 PROJECT PLAN"),
    ("ch10", "Chapter 10 CONCLUSION AND FUTURE WORK"),
    ("bib", "BIBLIOGRAPHY"),
    ("ref", "REFERENCES"),
]

FIG_TARGETS = [
    ("fig_arch", "Figure 4.1:"),
    ("fig_auth", "Figure 4.2:"),
    ("fig_book", "Figure 4.3:"),
    ("fig_uc", "Figure 5.1:"),
    ("fig_er", "Figure 5.2:"),
    ("fig_bill", "Figure 5.3:"),
    ("fig_gantt", "Figure 9.1:"),
]

TBL_TARGETS = [
    ("tbl_lit", "Table 2.1:"),
    ("tbl_gap", "Table 2.2:"),
    ("tbl_rbac", "Table 3.1:"),
    ("tbl_sysreq", "Table 3.2:"),
    ("tbl_schema", "Table 4.1:"),
    ("tbl_course", "Table 5.1:"),
    ("tbl_oop", "Table 5.2:"),
    ("tbl_actions", "Table 5.3:"),
    ("tbl_tc", "Table 6.1:"),
    ("tbl_results", "Table 6.2:"),
    ("tbl_seed", "Table 8.1:"),
    ("tbl_plan", "Table 9.1:"),
]


def main() -> None:
    for k, p in DIAGRAM_PATHS.items():
        if not Path(p).exists():
            raise FileNotFoundError(f"Missing diagram {k}: {p}")

    result = build_pdf(
        lambda toc_p, fig_p, tbl_p: build_full_html(toc_p, fig_p, tbl_p, DIAGRAM_PATHS),
        toc_targets=TOC_TARGETS,
        fig_targets=FIG_TARGETS,
        tbl_targets=TBL_TARGETS,
        page2_html=build_front_page2_html(),
        page4_html=build_front_page4_html(),
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
