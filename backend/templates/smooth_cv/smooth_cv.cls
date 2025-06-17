%----------------------------------%
% I use a famous animation character "Satoru Gojo" as a sample data. 
% The project does not include any personal and identificable data.
%----------------------------------%

%----------------------------------%
% Required packages
%----------------------------------%
%\NeedsTexFormat{LaTeX2e}
\ProvidesClass{smooth_cv}[Smooth CV Class]
\LoadClass[a4paper,12pt]{article}
\RequirePackage{enumitem}
\RequirePackage[utf8]{inputenc}
\RequirePackage[empty]{fullpage}
\RequirePackage[english]{babel}
\RequirePackage{latexsym}
\RequirePackage{tabularx}
\RequirePackage{fontawesome}
\RequirePackage[T1]{fontenc}
\RequirePackage{gentium}
\RequirePackage{titlesec}
\RequirePackage{xcolor}
\definecolor{myred}{RGB}{192,46,46}
\definecolor{myblue}{RGB}{7,75,164}
\definecolor{mygreen}{rgb}{0.11,0.7,0.02}
\RequirePackage[colorlinks = true,
    linkcolor = myred,
    urlcolor  = myred,
    citecolor = myred,
anchorcolor = myred]{hyperref}
\RequirePackage{geometry}
\RequirePackage{lastpage}
\RequirePackage{fancyhdr}
\RequirePackage{parskip}
\renewcommand\headrulewidth{0pt}
\fancyhf{}
\pagestyle{fancy}
\cfoot{\makebox[\textwidth][c]{Satoru Gojo - CV}}
\rfoot{\makebox[\textwidth][r]{\thepage /\pageref*{LastPage}}}

% Set the page margins
\geometry{letterpaper, portrait, margin=0.8in}
\setlength{\tabcolsep}{0in}

\newcommand{\prof}[2]{Professor \textbf{\href{#1}{#2}}}


% Set section
\titleformat{\section}
{\raggedright\Large\bfseries}{\thesection}{0em}{}[\vspace{-8pt}]

% Experience description formatting
\newcommand{\resumeItem}[1]{
    \setlength{\baselineskip}{12pt}
\item\small{
        {#1 \vspace{-1pt}}
    }
}

% Title entry formatting
\newcommand{\resumeSubheading}[4]{
\item
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \textbf{#1} & #2 \\
        \textit{\small #3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}


% Item symbol setting 
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

% Customize environment start and end
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}[leftmargin=0.13in]}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
%------------------------------------------- 