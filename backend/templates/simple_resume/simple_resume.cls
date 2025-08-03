%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% resume.cls
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{simple_resume}[2025/08/01 Custom Resume Class]
\LoadClass[11pt, letterpaper]{article}
\RequirePackage[T1]{fontenc}
\RequirePackage[utf8]{inputenc}
\RequirePackage{geometry}
\geometry{margin=0.75in}
\RequirePackage[hidelinks, pdftex]{hyperref}
\RequirePackage{enumitem}
\RequirePackage{xcolor}
\RequirePackage[explicit]{titlesec}
\RequirePackage{ragged2e}
\RequirePackage{array}
\RequirePackage{opensans}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\definecolor{resumegray}{RGB}{128, 128, 128}
\renewcommand{\familydefault}{\sfdefault}

% Universal header command with natural text wrapping - supports up to 5 contact fields
\newcommand{\makeheader}[5]{%
  \noindent
  \begin{minipage}[c]{0.6\textwidth}
    \setlength{\baselineskip}{1.2em}\setlength{\spaceskip}{0.7em}\Huge\bfseries #1
  \end{minipage}%
  \hfill
  \begin{minipage}[c]{0.35\textwidth}
    \centering\small
    #2 \\[0.5ex]
    #3 \\[0.5ex]
    #4 \\[0.5ex]
    #5
  \end{minipage}
  \par\vspace{2ex}
}
\titlespacing*{\section}{0pt}{1.5ex}{0.5ex}
\titleformat{\section}
  {\Large\bfseries\MakeUppercase}
  {}
  {0em}
  {#1}
  [\vspace{-1.5ex}\color{resumegray}\rule{0.3\textwidth}{0.5pt}]
\newcommand{\entryheader}[3]{%
  \noindent{\bfseries\large #1}\hfill{\itshape #3}\par
  \vspace{0.5ex}
  \noindent{\itshape #2}\par
  \vspace{0.5ex}
}
\newenvironment{entrybullets}{
  \begin{itemize}[leftmargin=*, topsep=0.25ex, partopsep=0ex, itemsep=0.25ex, parsep=0ex]
}{
  \end{itemize}
  \vspace{1.5ex}
}
\newcommand{\skillentry}[2]{%
  \noindent\hangindent=1.5em \hangafter=1
  \textbf{#1:}\quad #2\par
  \vspace{0.8ex}
}