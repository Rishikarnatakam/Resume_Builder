# LaTeX Core Rules (v2)

## QUICK SUMMARY
- Use only the current template and its commands (never change `\documentclass`).
- Follow strict document structure: `\documentclass` → packages → `\begin{document}` → content → `\end{document}`.
- Every content group must be inside a section environment (e.g., `\cvsection`, `\rSection`).
- Group skills by category, not as a flat list.
- Never output comments or explanations in the LaTeX code.

---

## TEMPLATE COMMANDS (EXAMPLES)
- **AltaCV:**
  - `\cvsection{Section}` — Section header
  - `\cvevent{Title}{Org}{Date}{Location}` — Experience/education entry
  - `\cvtag{Skill}` — Tag for project technologies
  - `\begin{paracol}{2}` ... `\end{paracol}` — Two-column layout
  - `\switchcolumn` — Move to right column
- **Professional Resume:**
  - `\rSection{Section}` — Section header
  - `\begin{rSubsection}{Company}{Date}{Title}{Location}` ... `\end{rSubsection}` — Experience entry
  - `\begin{rAward}{Title}{Org}{Date}` ... `\end{rAward}` — Award entry
  - `\begin{rCertification}{Name}{Issuer}{Date}` ... `\end{rCertification}` — Certification entry

---

## GOOD/BAD LATEX EXAMPLES

**Good: Proper Sectioning**
```latex
\cvsection{Projects}
\cvevent{Project Title}{Company}{2023}{Remote}
\begin{itemize}
  \item Built X
  \item Improved Y
\end{itemize}
```

**Bad: Content Outside Section**
```latex
Project Title at Company, 2023
Built X, Improved Y
```

**Good: Grouped Skills**
```latex
\cvsection{Skills}
Programming Languages: Python, JavaScript\
Frameworks: React, Flask\
Tools: Git, Docker
```

**Bad: Flat Skills List**
```latex
\cvsection{Skills}
Python, JavaScript, React, Flask, Git, Docker
```

---

## STRUCTURE CHECKLIST
- [ ] All content is inside section environments
- [ ] Every `\begin` has a matching `\end`
- [ ] Sections are in logical order (Header → Education → Skills → Projects → Awards → Certifications)
- [ ] No content is floating outside sections
- [ ] No comments or explanations in LaTeX output

---

## TROUBLESHOOTING (for AI)
- If a section is empty, omit it.
- If a command is missing, define it based on template patterns.
- If output is not compiling, check for unmatched `\begin`/`\end` and section environments.
- If unsure about grouping, use common categories: Programming Languages, Frameworks, Tools, Databases, Cloud.

---

## FINAL CHECKLIST
- [ ] Used only current template and commands
- [ ] Grouped and organized all content logically
- [ ] No comments or explanations in LaTeX output
- [ ] Output is clean, compilable LaTeX
- [ ] User request is satisfied 