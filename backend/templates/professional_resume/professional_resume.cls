

\ProvidesClass{professional_resume}[2010/07/10 v0.9 Professional Resume class]

\LoadClass[11pt,letterpaper]{article} % Font size and paper type

\usepackage[parfill]{parskip} % Remove paragraph indentation
\usepackage{anyfontsize} % Allow custom font sizes beyond standard LaTeX sizes
\usepackage{array} % Required for boldface (\bf and \bfseries) tabular columns
\usepackage{geometry}
\geometry{margin=0.75in} % Default margin - can be overridden
\usepackage{ifthen} % Required for ifthenelse statements

\usepackage{hyperref}
\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,      
    urlcolor=blue,
}

\pagestyle{empty} % Suppress page numbers

%----------------------------------------------------------------------------------------
%	HEADINGS COMMANDS: Commands for printing name and address
%----------------------------------------------------------------------------------------

\def \name#1{\def\@name{#1}} % Defines the \name command to set name
\def \@name {} % Sets \@name to empty by default

\def \addressSep {$\diamond$} % Set default address separator to a diamond

% One, two or three address lines can be specified 
\let \@addressone \relax
\let \@addresstwo \relax
\let \@addressthree \relax

% \address command can be used to set the first, second, and third address (last 2 optional)
\def \address #1{
  \@ifundefined{@addresstwo}{
    \def \@addresstwo {#1}
  }{
  \@ifundefined{@addressthree}{
  \def \@addressthree {#1}
  }{
     \def \@addressone {#1}
  }}
}

% \printaddress is used to style an address line (given as input)
\def \printaddress #1{
  \begingroup
    \def \\ {\addressSep\ }
    \centerline{#1}
  \endgroup
  \par
  \addressskip
}

% \printname is used to print the name as a page header
\def \printname {
  \begingroup
    \hfil{\MakeUppercase{\namesize\bf \@name}}\hfil
    \nameskip\break
  \endgroup
}

%----------------------------------------------------------------------------------------
%	PRINT THE HEADING LINES
%----------------------------------------------------------------------------------------

\let\ori@document=\document
\renewcommand{\document}{
  \ori@document  % Begin document
  \printname % Print the name specified with \name
  \@ifundefined{@addressone}{}{ % Print the first address if specified
    \printaddress{\@addressone}}
  \@ifundefined{@addresstwo}{}{ % Print the second address if specified
    \printaddress{\@addresstwo}}
     \@ifundefined{@addressthree}{}{ % Print the third address if specified
    \printaddress{\@addressthree}}
}

%----------------------------------------------------------------------------------------
%	SECTION FORMATTING
%----------------------------------------------------------------------------------------

% Defines the rSection environment for the large sections within the CV
\newenvironment{rSection}[1]{ % 1 input argument - section name
  \sectionskip
  \textcolor{black}{\MakeUppercase{{\bf #1}}} % Section title - black color
  \sectionlineskip
  \textcolor{black}{\hrule} % Horizontal line - black color
  \vspace{0.5em} % Add extra space after the horizontal line
  \begin{list}{}{ % List for each individual item in the section
    \setlength{\leftmargin}{0em} % Margin within the section
    \setlength{\itemsep}{0.25em} % Consistent spacing between items
    \setlength{\parsep}{0em} % No extra paragraph spacing
  }
  \item[]
}{
  \end{list}
}

%----------------------------------------------------------------------------------------
%	WORK EXPERIENCE FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rSubsection}[4]{ % 4 input arguments - company name, year(s) employed, job title and location
 {\bf\textcolor{black}{#1}} \hfill {#2} % Bold black company name and date on the right
 \ifthenelse{\equal{#3}{}}{}{ % If the third argument is not specified, don't print the job title and location line
  \\
  {\em #3} \hfill {\em #4} % Italic job title and location
  }\medskip
  \begin{list}{$\cdot$}{\leftmargin=0em} % \cdot used for bullets, no indentation
   \setlength{\itemsep}{0.25em} % Consistent spacing between bullet points
   \setlength{\parsep}{0em} % No extra paragraph spacing
  }{
  \end{list}
  \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	SKILLS FORMATTING
%----------------------------------------------------------------------------------------

% New environment for skills with bulleted categories
\newenvironment{rSkills}{
  \begin{list}{}{ % List for skill categories
    \setlength{\leftmargin}{0em} % No indentation
    \setlength{\itemsep}{0.25em} % Consistent spacing between skill categories
    \setlength{\parsep}{0em} % No extra paragraph spacing
  }
}{
  \end{list}
}

%----------------------------------------------------------------------------------------
%	AWARDS FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rAward}[3]{ % 3 input arguments - award title, organization, and date
 {\bf\textcolor{black}{#1}} \hfill {#3} % Bold black award title and date on the right
 \smallskip
 \begin{list}{$\cdot$}{\leftmargin=0em} % \cdot used for bullets, no indentation
  \setlength{\itemsep}{0.25em} % Consistent spacing between bullet points
  \setlength{\parsep}{0em} % No extra paragraph spacing
 }{
 \end{list}
 \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	CERTIFICATIONS FORMATTING
%----------------------------------------------------------------------------------------

\newenvironment{rCertification}[3]{ % 3 input arguments - certification name, issuer, and date
 {\bf\textcolor{black}{#1}}, #2 \hfill {#3} % Bold black certification name, issuer, and date on the right
 \smallskip
 \begin{list}{$\cdot$}{\leftmargin=0em} % \cdot used for bullets, no indentation
  \setlength{\itemsep}{0.25em} % Consistent spacing between bullet points
  \setlength{\parsep}{0em} % No extra paragraph spacing
 }{
 \end{list}
 \vspace{0.5em} % Some space after the list of bullet points
}

%----------------------------------------------------------------------------------------
%	WHITESPACE DEFINITIONS
%----------------------------------------------------------------------------------------

% The below commands define the whitespace after certain things in the document - they can be \smallskip, \medskip or \bigskip

% Custom font sizes larger than standard LaTeX sizes
\newcommand{\HUGE}{\fontsize{34.4}{41}\selectfont}
\newcommand{\GIGANTIC}{\fontsize{41.3}{50}\selectfont}
\newcommand{\MASSIVE}{\fontsize{49.6}{60}\selectfont}
\newcommand{\ENORMOUS}{\fontsize{59.5}{72}\selectfont}

\providecommand{\namesize}{\LARGE} % Size of the name at the top of the document (user-overridable)
\def\addressskip{\medskip} % The space between the two address (or phone/email) lines
\def\sectionlineskip{\medskip} % The space above the horizontal line for each section 
\def\nameskip{\medskip} % The space after your name at the top
\def\sectionskip{\medskip} % The space after the heading section 