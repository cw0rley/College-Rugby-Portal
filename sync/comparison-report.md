# Firestore Update — Comparison Report
Generated: 2026-03-22

## Summary

| | Count |
|---|---|
| **Merged dataset (what we push)** | **993** |
| **Current Firestore** | **826** |
| New programs to ADD | 418 |
| Stale programs to REMOVE | 210 |
| Shared programs with CHANGES | 569 |
| Net change | +167 programs |

> **Warning:** 161 of the 210 removed programs have coach contacts and 159 have emails. These would be lost if we do a full replace.

## What's changing and why

**Conference codes** — Your spreadsheet uses abbreviations (LSC, BRRC, MARC, etc.) that map to the `conferences` Firestore collection. The old data had full names (Lonestar Mens, Big Rivers Mens, etc.). All 569 shared records have this change.

**League reclassifications** — 465 programs have different league assignments. This reflects the 2025-2026 season restructuring. For example, many 'NCR SC' programs moved to 'NCR D2' or 'NCR D3'.

**City format** — Old data had 'City, ST' format (e.g., 'Adrian, MI'). New data has just the city name ('Adrian'). The state is in a separate field.

**Academic/ranking updates** — ~19 programs have updated GPA, SAT, enrollment, tuition, or acceptance rate data. 152 programs have updated rugby rankings.

## New programs to ADD (419)

| School | Gender | Conference | League |
|---|---|---|---|
| Abilene Christian University | womens | LSC | NCR D2 |
| Albright College | womens | LERC | NCR D2 |
| Alfred State College | mens | LERC | NCR D2 |
| Alfred State College | womens | LERC | NCR D2 |
| American International College | womens | NIRA | NIRA DII |
| American River College | mens | NORCAL | CRAA D1AA |
| American University | womens | MARC | NCR D2 |
| Amherst College | womens | NERFU | NCR D2 |
| Anna Maria College | womens | RNECRC | NCR D2 |
| Appalachian State University | womens | SAWCRC | NCR D2 |
| Ashland University | mens | GLCRC | NCR D1AA |
| Ashland University | womens | GLCRC | NCR D1AA |
| Auburn University | mens | SCRC | NCR D2 |
| Auburn University | womens | SAWCRC | NCR D2 |
| Augustana College | mens | MWCRC | NCR D2 |
| Ave Maria University | womens | FCRC | NCR D2 |
| Azusa Pacific University | womens | NWC | NCR D2 |
| Baldwin Wallace University | mens | ARU | NCR D3 |
| Baldwin Wallace University | womens | ARU | NCR D3 |
| Ball State University | mens | CARD | NCR SC |
| Ball State University | womens | GLCRC | NCR D2 |
| Bard College | womens | RNECRC | NCR D2 |
| Bates College | womens | NERFU | NCR D2 |
| Bethel University | womens | NLCRC | NCR D2 |
| Binghamton University (SUNY) | mens | LERC | NCR D1AA |
| Bloomsburg University of Pennsylvania | mens | LERC | NCR D2 |
| Bloomsburg University of Pennsylvania | womens | LERC | NCR D2 |
| Brandeis University | mens | RNECRC | NCR D2 |
| Bridgewater State University | mens | NACR | NCR D3 |
| Bridgewater State University | womens | RNECRC | NCR D2 |
| Bucknell University | mens | MARC | NCR D2 |
| Bucknell University | womens | SCRC | NCR D1AA |
| California Lutheran University | womens | NWC | NCR D2 |
| California Polytechnic State University | womens | WCC | CRAA D2 |
| California State Polytechnic University, Humboldt | mens | NORCAL | CRAA D1AA |
| California State Polytechnic University, Humboldt | womens | WCC | CRAA D2 |
| California State University Maritime Academy | womens | WCC | CRAA D2 |
| California State University, Chico | mens | NORCAL | CRAA D1AA |
| California State University, Chico | womens | PMRC | CRAA D1A |
| California State University, Fresno | mens | NORCAL | CRAA D1AA |
| California State University, Fresno | womens | PMRC | CRAA D1A |
| California State University, Fullerton | mens | GC | CRAA D2 |
| California State University, Long Beach | mens | CC | CRAA D1A |
| California State University, Long Beach | womens | PDRC | CRAA D2 |
| California State University, Monterey Bay | mens | NWC | NCR D2 |
| California State University, Monterey Bay | womens | NWC | NCR D2 |
| California State University, Northridge | mens | NWC | NCR D2 |
| California State University, Northridge | womens | PDRC | CRAA D2 |
| California State University, Sacramento | mens | CC | CRAA D1A |
| California State University, Sacramento | womens | NORCAL | CRAA D2 |
| Calvin University | womens | GLCRC | NCR D3 |
| Campbell University | womens | SAWCRC | NCR D2 |
| Canisius University | mens | LERC | NCR D1AA |
| Canisius University | womens | LERC | NCR D2 |
| Carnegie Mellon University | womens | ARU | NCR D3 |
| Case Western Reserve University | womens | GLCRC | NCR D2 |
| Castleton University | mens | NACR | NCR D3 |
| Cedarville University | womens | ARU | NCR D2 |
| Central College | womens | MWCRC | NCR D2 |
| Central Oregon Community College | womens | NWC | NCR D2 |
| Champlain College | womens | RNECRC | NCR D2 |
| Christendom College | womens | CMCRC | NCR D2 |
| Christopher Newport University | womens | TSCRC | NCR D1AA |
| Claremont Colleges | womens | PDRC | CRAA D1A |
| Clarion University of Pennsylvania | womens | ARU | NCR D2 |
| Colby College | womens | NERFU | NCR D3 |
| College of Charleston | womens | SAWCRC | NCR D2 |
| College of St. Scholastica | mens | NLCRC | NCR D2 |
| College of St. Scholastica | womens | NLCRC | NCR D2 |
| College of the Holy Cross | mens | NACR | NCR D3 |
| College of the Holy Cross | womens | NACR | NCR D3 |
| College of William & Mary | womens | MARC | NCR D2 |
| Colorado College | womens | HPRC | NCR D2 |
| Colorado Mesa University | womens | HPRC | NCR D3 |
| Colorado School of Mines | womens | HPRC | NCR D3 |
| Colorado State University Pueblo | womens | HPRC | NCR D2 |
| Covenant College | womens | SRC | NCR D2 |
| Curry College | womens | RNECRC | NCR D2 |
| Davidson College | mens | SRC | NCR D2 |
| Denison University | womens | ARU | NCR D1AA |
| DePaul University | mens | GMCRC | NCR D3 |
| Drew University | womens | RNECRC | NCR D2 |
| Drury University | mens | BRRC | NCR D1A |
| Duke University | mens | SRC | NCR D3 |
| Duke University | womens | SAWCRC | NCR D1AA |
| Duquesne University | mens | TSCRC | NCR D2 |
| Earlham College | mens | MWCRC | NCR D2 |
| East Stroudsburg University | mens | LERC | NCR D2 |
| East Stroudsburg University | womens | LERC | NCR D3 |
| Eastern Connecticut State University | mens | RNECRC | NCR D3 |
| Eastern Illinois University | mens | MWCRC | NCR D2 |
| Eastern Illinois University | womens | MWCRC | NCR D2 |
| Eastern Kentucky University | womens | SRC | NCR D2 |
| Eastern Michigan University | womens | GLCRC | NCR D2 |
| Eckerd College | womens | FCRC | CRAA D2 |
| Elon University | womens | SAWCRC | NCR D3 |
| Embry-Riddle Aeronautical University | mens | FCRC | CRAA D2 |
| Emory & Henry University | mens | SRC | NCR D2 |
| Emory & Henry University | womens | SRC | NCR D2 |
| Emory and Henry College | womens | NIRA | NIRA DII |
| Emory University | womens | SCRC | NCR D3 |
| Fairmont State University | mens | ARU | NCR D2 |
| Florida Atlantic University | womens | FCRC | CRAA D2 |
| Florida Gulf Coast University | mens | GMCRC | NCR D2 |
| Florida Gulf Coast University | womens | GMCRC | NCR D2 |
| Florida International University | mens | FCRC | CRAA D2 |
| Florida International University | womens | FCRC | CRAA D2 |
| Florida State University | mens | FCRC | CRAA D1AA |
| Fordham University | womens | LRC | NCR D2 |
| Framingham State University | mens | RNECRC | NCR D2 |
| Franciscan University of Steubenville | womens | ARU | NCR D3 |
| Gannon University | mens | ARU | NCR D2 |
| Geneva College | womens | ARU | NCR D2 |
| George Mason University | womens | MARC | NCR D3 |
| George Washington University | womens | MARC | NCR D2 |
| Georgetown University | womens | MARC | NCR D2 |
| Georgia College & State University | womens | SRC | NCR D2 |
| Georgia Institute of Technology | mens | GMCRC | NCR D1AA |
| Georgia Institute of Technology | womens | GMCRC | NCR D2 |
| Gonzaga University | womens | PMRC | CRAA D1A |
| Grace College | mens | MWCRC | NCR D2 |
| Grove City College | womens | ARU | NCR D2 |
| Guilford College | mens | SRC | NCR D3 |
| Haverford College | womens | LERC | NCR D2 |
| High Point University | mens | SRC | NCR D3 |
| Hillsdale College | womens | GLCRC | NCR D2 |
| Hobart and William Smith Colleges | mens | LERC | NCR D3 |
| Holy Cross College | mens | GLCRC | NCR D2 |
| Hope College | womens | GLCRC | NCR D2 |
| Idaho State University | womens | NWC | NCR D2 |
| Indiana State University | mens | GRC | NCR D2 |
| Indiana State University | womens | CARD | NCR D2 |
| Indiana University Bloomington | mens | B1G | NCR D1A |
| Indiana University Bloomington | womens | B1G | NCR D1AA |
| Iona University | mens | LRC | NCR D1A |
| Iona University | womens | TSCRC | NCR D2 |
| Iowa Central Community College | mens | BRRC | NCR D1A |
| IUPUI (Indiana Univ–Purdue Univ Indy) | mens | MWCRC | NCR D2 |
| IUPUI (Indiana Univ–Purdue Univ Indy) | womens | MWCRC | NCR D2 |
| John Brown University | womens | MARC | NCR D2 |
| Johns Hopkins University | womens | MARC | NCR D3 |
| Kennesaw State University | mens | SCRC | NCR D2 |
| Kennesaw State University | womens | SCRC | NCR D1AA |
| Kings College | mens | LERC | NCR D2 |
| Kings College | womens | LERC | NCR D2 |
| Kutztown University of Pennsylvania | mens | ARC | NCR D1A |
| Kutztown University of Pennsylvania | womens | LERC | NCR D2 |
| La Salle University | mens | MARC | NCR D2 |
| La Salle University | womens | MARC | NIRA D1 |
| Lafayette College | mens | SCRC | NCR D1AA |
| Lasell University | mens | RNECRC | NCR D2 |
| Lewis & Clark College | mens | NWC | NCR D2 |
| Lewis & Clark College | womens | NWC | NCR D2 |
| Long Island University | mens | TSCRC | NCR D2 |
| Long Island University | womens | TSCRC | NIRA D1 |
| Louisiana State University Alexandria | womens | RRC | NCR D2 |
| Louisiana State University | mens | SCRC | NCR D1AA |
| Louisiana State University | womens | SAWCRC | NCR D2 |
| Louisiana Tech University | mens | RRC | NCR D1AA |
| Louisiana Tech University | womens | RRC | NCR D2 |
| Loyola Marymount University | mens | GC | CRAA D2 |
| Loyola University Maryland | womens | MARC | NCR D2 |
| Manhattanville College | mens | RNECRC | NCR D2 |
| Marian University | womens | GLCRC | NCR D2 |
| Marshall University | womens | ARU | NCR D2 |
| Massachusetts Institute of Technology | mens | RNECRC | NCR D2 |
| Massachusetts Maritime Academy | mens | NACR | NCR D3 |
| Massachusetts Maritime Academy | womens | NACR | NCR D3 |
| McGill University | womens | CAN | U Sports Varsity |
| Merrimack College | womens | NACR | NCR D3 |
| Miami University | mens | ARU | NCR D1AA |
| Miami University | womens | ARU | NCR D1AA |
| Middle Tennessee State University | womens | SRC | NCR D2 |
| Millennia Atlantic University | mens | FCRC | CRAA D2 |
| Minnesota State University, Mankato | mens | NLCRC | NCR D2 |
| Minnesota State University, Mankato | womens | NLCRC | NCR D2 |
| MiraCosta College | womens | PDRC | CRAA D2 |
| Mississippi State University | womens | SRC | NCR D2 |
| Missouri University of Science and Technology | mens | GRC | NCR D2 |
| Missouri University of Science and Technology | womens | GRC | NCR D2 |
| Mitchell College | womens | RNECRC | NCR D2 |
| Molloy University | mens | TSCRC | NCR D2 |
| Molloy University | womens | TSCRC | NCR D2 |
| Montclair State University | womens | TSCRC | NCR D2 |
| Moravian University | mens | LERC | NCR D2 |
| Moravian University | womens | LERC | NCR D2 |
| Mount St. Marys University | mens | RE | CRAA D1A |
| Nazareth University | mens | LRC | NCR D1A |
| Nazareth University | womens | LERC | NCR D2 |
| Neumann University | mens | LERC | NCR D2 |
| Neumann University | womens | LERC | NCR D2 |
| New Mexico Highlands University | womens | HPRC | NCR D2 |
| New Mexico Institute of Mining and Technology | womens | HPRC | NCR D2 |
| Newberry College | mens | SAWCRC | NCR D2 |
| Niagara University | womens | LERC | NCR D3 |
| Nichols College | womens | RNECRC | NCR D2 |
| Northwestern University | womens | B1G | NCR D2 |
| Nova Southeastern University | mens | GMCRC | NCR D2 |
| Nova Southeastern University | womens | GMCRC | NCR D2 |
| Occidental College | mens | GC | CRAA D2 |
| Occidental College | womens | PDRC | CRAA D2 |
| Ohio Northern University | womens | ARU | NCR D3 |
| Oklahoma State University | mens | HOA | CRAA D1AA |
| Oregon Institute of Technology | womens | NWC | NCR D3 |
| Paul Smiths College | mens | UNYR | NCR D2 |
| Paul Smiths College | womens | UNYR | NCR D2 |
| Penn State Altoona | mens | ARU | NCR D2 |
| Penn State Berks | mens | LERC | NCR D2 |
| Pennsylvania State University | mens | RE | CRAA D1A |
| Pennsylvania State University | womens | IND | NCR D1A |
| Pepperdine University | mens | GC | CRAA D2 |
| Point Loma Nazarene University | mens | GC | CRAA D2 |
| Point Loma Nazarene University | womens | NWC | NCR D2 |
| Point Park University | womens | ARU | NCR D3 |
| Prairie View A&M University | mens | LSC | CRAA D2 |
| Prairie View A&M University | womens | LSC | NCR D2 |
| Principia College | womens | GRC | NCR D2 |
| Providence College | womens | NACR | NCR D3 |
| Randolph-Macon College | mens | CMCRC | NCR D3 |
| Randolph-Macon College | womens | MARC | NCR D3 |
| Reed College | mens | NWC | NCR D3 |
| Regis College | womens | RNECRC | NCR D2 |
| Regis University | womens | HPRC | NCR D3 |
| Roanoke College | womens | MARC | NCR D2 |
| Saint Anselm College | womens | RNECRC | NCR D2 |
| Saint John's University | mens | NLCRC | NCR D3 |
| Saint Josephs University | mens | MARC | NCR D1AA |
| Saint Josephs University | womens | LRC | NCR D1AA |
| Saint Louis University | womens | GRC | NCR D1AA |
| Saint Marys College of California | mens | CC | CRAA D1A |
| Saint Marys College of California | womens | WCC | CRAA D2 |
| Saint Michaels College Rugby | mens | RNECRC | NCR D2 |
| Saint Michaels College Rugby | womens | RNECRC | NCR D2 |
| Saint Vincent College | mens | ARU | NCR D2 |
| Salem State University | womens | RNECRC | NCR D2 |
| San Diego State University | womens | PDRC | CRAA D1A |
| San Francisco State University | womens | CC | CRAA D2 |
| San Jose State University | mens | NORCAL | CRAA D1AA |
| San Jose State University | womens | WCC | CRAA D2 |
| Santa Clara University | womens | WCC | CRAA D2 |
| Seattle University | mens | NWC | NCR D1AA |
| Seton Hall University | womens | TSCRC | NCR D3 |
| Sewanee: The University of the South | womens | SAWCRC | NCR D3 |
| Slippery Rock University | womens | ARU | NCR D3 |
| Southeastern Louisiana University | mens | RRC | NCR D2 |
| Southeastern Louisiana University | womens | RRC | NCR D2 |
| Southern Connecticut State University | womens | RNECRC | NCR D2 |
| Southern Illinois University Carbondale | mens | GRC | NCR D1AA |
| Southern Illinois University Carbondale | womens | GRC | NCR D2 |
| Southern Methodist University | mens | LSC | CRAA D2 |
| Southern Nazarene University | womens | LSC | NCR D1A |
| Southern Oregon University | mens | CMCRC | NCR D1A |
| Southern Virginia University | womens | MARC | NCR D2 |
| Spring Hill College | womens | SAWCRC | NCR D2 |
| St. Edward's University | mens | LSC | CRAA D2 |
| St. John Fisher University | mens | LERC | NCR D1AA |
| St. John Fisher University | womens | LERC | NCR D1AA |
| St. Johns University | mens | TSCRC | NCR D1AA |
| St. Johns University | womens | TSCRC | NCR D1AA |
| St. Marys College of Maryland | mens | CMCRC | NCR D2 |
| St. Marys College of Maryland | womens | CMCRC | NCR D2 |
| St. Thomas University | womens | FCRC | CRAA D2 |
| Stanford University | mens | PAC | CRAA D1A |
| Stephen F. Austin State University | mens | LSC | NCR D2 |
| Stonehill College | womens | NACR | NCR D3 |
| Stony Brook University (SUNY) | mens | LERC | NCR D1AA |
| Stony Brook University (SUNY) | womens | LERC | NCR D1AA |
| SUNY Buffalo State College | mens | LERC | NCR D2 |
| Tennessee Technological University | mens | SRC | NCR D2 |
| Texas A&M University-Corpus Christi | mens | LSC | CRAA D2 |
| Texas A&M University | womens | LSC | NCR D1AA |
| Texas Tech University | mens | TSCRC | NCR D1AA |
| The Catholic University of America | mens | CMCRC | NCR D3 |
| The Catholic University of America | womens | CMCRC | NCR D2 |
| The Citadel | mens | SRC | NCR D3 |
| The College of Wooster | mens | ARU | NCR D2 |
| The College of Wooster | womens | ARU | NCR D2 |
| Thomas College | mens | RNECRC | NCR D2 |
| Towson University | womens | MARC | NCR D2 |
| Trine University | mens | IND | CRAA D1AA |
| Trinity University | mens | LSC | CRAA D2 |
| UMKC (Missouri-Kansas City) | mens | MARC | NCR D2 |
| UMKC (Missouri-Kansas City) | womens | MARC | NCR D2 |
| United States Coast Guard Academy | womens | RNECRC | NCR D2 |
| United States Merchant Marine Academy | mens | LERC | NCR D1AA |
| University at Albany (SUNY) | mens | LERC | NCR D1AA |
| University at Albany (SUNY) | womens | LERC | NCR D1AA |
| University at Buffalo (SUNY) | mens | LERC | NCR D1AA |
| University at Buffalo (SUNY) | womens | LERC | NCR D1AA |
| University of Alabama at Birmingham | mens | SRC | NCR D1AA |
| University of Alabama at Birmingham | womens | SRC | NCR D2 |
| University of Alabama in Huntsville | mens | SRC | NCR D2 |
| University of Alabama in Huntsville | womens | SRC | NCR D2 |
| University of California, Berkeley | mens | IND | CRAA D1A |
| University of California, Berkeley | womens | PMRC | CRAA D1A |
| University of California, Davis | mens | CC | CRAA D1A |
| University of California, Davis | womens | PMRC | CRAA D1A |
| University of California, Irvine | womens | PDRC | CRAA D2 |
| University of California, Los Angeles | mens | CC | CRAA D1A |
| University of California, Los Angeles | womens | PDRC | CRAA D1A |
| University of California, Riverside | mens | GC | CRAA D2 |
| University of California, Riverside | womens | PDRC | CRAA D2 |
| University of California, San Diego | mens | GC | CRAA D2 |
| University of California, San Diego | womens | PDRC | CRAA D1A |
| University of California, Santa Barbara | mens | CC | CRAA D1A |
| University of California, Santa Barbara | womens | PDRC | CRAA D1A |
| University of California, Santa Cruz | mens | CC | CRAA D1A |
| University of California, Santa Cruz | womens | WCC | CRAA D2 |
| University of Cincinnati | mens | ARU | NCR D1AA |
| University of Colorado Boulder | mens | RCKYM | CRAA D1A |
| University of Dallas | womens | LSC | NCR D2 |
| University of Dayton | mens | ARU | NCR D1AA |
| University of Dayton | womens | GMCRC | NCR D1AA |
| University of Denver | mens | HPRC | NCR D3 |
| University of Denver | womens | HPRC | NCR D3 |
| University of Findlay | mens | GLCRC | NCR D1AA |
| University of Florida | mens | FCRC | CRAA D1AA |
| University of Health Sciences & Pharmacy in St. Louis | mens | HOA | CRAA D1AA |
| University of Health Sciences and Pharmacy in St. Louis | mens | GRC | NCR D2 |
| University of Houston | womens | LSC | NCR D2 |
| University of Illinois Urbana-Champaign | mens | B1G | CRAA D1A |
| University of Illinois Urbana-Champaign | womens | B1G | NCR D2 |
| University of Iowa | womens | MWCRC | NCR D1AA |
| University of Kansas | womens | MWCRC | NCR D2 |
| University of Kentucky | womens | SCRC | NCR D2 |
| University of Louisiana at Lafayette | mens | RRC | NCR D1AA |
| University of Louisiana at Lafayette | womens | RRC | NCR D2 |
| University of Louisville | womens | ARU | NCR D2 |
| University of Lynchburg | mens | BRRC | NCR D2 |
| University of Lynchburg | womens | BRRC | NCR D2 |
| University of Maine at Farmington | mens | NERFU | NCR D2 |
| University of Maine at Farmington | womens | NERFU | NCR D2 |
| University of Maine | mens | NACR | NCR D3 |
| University of Maine | womens | NACR | NCR D3 |
| University of Maryland, Baltimore County | mens | CMCRC | NCR D2 |
| University of Maryland, Baltimore County | womens | CMCRC | NCR D2 |
| University of Maryland | womens | CMCRC | NCR D1AA |
| University of Massachusetts Lowell | womens | RNECRC | NCR D2 |
| University of Memphis | womens | SCRC | NCR D2 |
| University of Miami | mens | FCRC | CRAA D2 |
| University of Miami | womens | FCRC | CRAA D2 |
| University of Mississippi | womens | SCRC | NCR D2 |
| University of Nebraska Omaha | womens | GRC | NCR D2 |
| University of Nebraska-Lincoln | mens | HOA | CRAA D1AA |
| University of Nebraska-Lincoln | womens | HOA | NCR D1AA |
| University of Nevada Las Vegas | mens | GC | CRAA D2 |
| University of Nevada Las Vegas | womens | PDRC | CRAA D2 |
| University of Nevada, Reno | mens | NORCAL | CRAA D1AA |
| University of Nevada, Reno | womens | WCC | CRAA D2 |
| University of New Hampshire | womens | NACR | NCR D2 |
| University of North Alabama | womens | SRC | NCR D2 |
| University of North Carolina at Chapel Hill | mens | IND | CRAA D1AA |
| University of North Carolina at Chapel Hill | womens | SAWCRC | NCR D1AA |
| University of North Carolina at Charlotte | mens | SAWCRC | NCR D1AA |
| University of North Carolina at Charlotte | womens | SAWCRC | NCR D2 |
| University of North Carolina at Greensboro | mens | SAWCRC | NCR D2 |
| University of North Carolina at Greensboro | womens | SAWCRC | NCR D2 |
| University of North Carolina Wilmington | womens | SAWCRC | NCR D2 |
| University of North Florida | mens | FCRC | CRAA D2 |
| University of North Texas | mens | LSC | NCR D1AA |
| University of Northern Colorado | womens | HPRC | NCR D2 |
| University of Oregon | mens | NWC | CRAA D1AA |
| University of Pittsburgh at Johnstown | mens | ARU | NCR D2 |
| University of Pittsburgh at Johnstown | womens | ARU | NCR D2 |
| University of Pittsburgh | mens | ARU | NCR D1AA |
| University of Puget Sound | womens | NWC | NCR D2 |
| University of Richmond | womens | MARC | NCR D3 |
| University of Rio Grande | mens | BRRC | NCR D1A |
| University of Rio Grande | womens | ARU | NCR D2 |
| University of San Diego | womens | PDRC | CRAA D2 |
| University of San Francisco | womens | WCC | CRAA D2 |
| University of South Dakota | mens | GRC | NCR D2 |
| University of Southern California | mens | SW | CRAA D1AA |
| University of Southern California | womens | PDRC | CRAA D2 |
| University of St. Thomas | womens | SAWCRC | NCR D1AA |
| University of Tennessee at Chattanooga | mens | SRC | NCR D3 |
| University of Tennessee | womens | SCRC | NCR D1AA |
| University of Texas at Austin | mens | RRC | NCR D1AA |
| University of Texas at Austin | womens | LSC | NCR D1AA |
| University of Texas at Dallas | mens | LSC | CRAA D2 |
| University of Texas at El Paso | mens | SW | CRAA D1AA |
| University of Texas at San Antonio | mens | LSC | NCR D1AA |
| University of Texas at San Antonio | womens | LSC | NCR D2 |
| University of Tulsa | mens | GRC | NCR D2 |
| University of Utah | womens | PMRC | CRAA D1A |
| University of Washington | mens | NWC | CRAA D1AA |
| University of Wisconsin-Eau Claire | mens | NWC | NCR D3 |
| University of Wisconsin-Eau Claire | womens | CMCRC | NCR D2 |
| University of Wisconsin-La Crosse | mens | NWC | NCR D1AA |
| University of Wisconsin-Madison | mens | B1G | NCR D1A |
| University of Wisconsin-Madison | womens | B1G | NCR D1AA |
| University of Wisconsin-Milwaukee | mens | NWC | NCR D2 |
| University of Wisconsin-Oshkosh | mens | NWC | NCR D2 |
| University of Wisconsin-Platteville | mens | NWC | NCR D2 |
| University of Wisconsin-Platteville | womens | CMCRC | NCR D3 |
| University of Wisconsin-Stevens Point | mens | NWC | NCR D2 |
| University of Wisconsin-Stout | mens | NWC | NCR D2 |
| University of Wisconsin-Whitewater | mens | NWC | NCR D2 |
| Ursinus College | mens | MARC | NCR D3 |
| Valparaiso University | mens | CARD | NCR D2 |
| Vassar College | womens | TSCRC | NCR D2 |
| Villanova University | womens | MARC | NCR D2 |
| Virginia Commonwealth University | womens | MARC | NCR D2 |
| Virginia Polytechnic Institute and State University | mens | MARC | NCR D1AA |
| Wake Forest University | womens | SAWCRC | NCR D2 |
| Warren Wilson College | mens | SAWCRC | NCR D2 |
| Washington University in St. Louis | mens | GRC | NCR D2 |
| Wayne State University | womens | GLCRC | NCR D3 |
| West Chester University of Pennsylvania | mens | MARC | NCR D1AA |
| West Chester University of Pennsylvania | womens | NIRA | NIRA DII |
| Western Illinois University | mens | MWCRC | NCR D2 |
| Whitman College | mens | NWC | NCR D2 |
| Willamette University | mens | NWC | NCR D2 |
| William Paterson University | mens | TSCRC | NCR D3 |
| William Smith College | womens | LERC | NCR D1AA |
| Xavier University | womens | GMCRC | NCR D1AA |
| Yale University | womens | IVY | NCR D3 |
| Youngstown State University | mens | ARU | NCR D2 |

## Programs to REMOVE (210)

These are in Firestore but NOT in your updated spreadsheet.

| School | Gender | Conference | League | Contact | Email |
|---|---|---|---|---|---|
| Albright University | womens | Eastern Penn Womens | NCR SC | Lance Orndorf | ljorndorf@gmail.com |
| Alfred College | mens | Upstate Small Mens | NCR SC | Dale Russell | drussell@alfred.edu |
| Baldwin Wallace | mens | Ohio Valley Womens | NCR SC | Christine Varga | ccancian@bw.edu |
| Ball St University | mens | Midwest Mens | NCR D2 |  |  |
| Bloomsburg University | mens | Mid-Atlantic Mens | NCR D2 | Benjamin Watton | bew66011@huskies.bloomu.edu |
| Bloomsburg University | womens | Eastern Penn Womens | CRAA D1 | Kevin Castner | castner@live.com |
| Bridgewater State | mens | Colonial Coast Men | NCR SC | Erica Adams | e4adams@bridgew.edu |
| Bucknell Unviersity | mens | Mid-Atlantic Mens | NCR D2 | Karen Landis | kelandis@bucknell.edu |
| Buffalo State College | mens | Upstate Small Mens | NCR SC | Zachary Edwards | zack.edwards87@outlook.com |
| California Polytechnic State University San Luis Obispo | mens | California Mens | CRAA D1A | Chris O'Brien | calpolyrugby@gmail.com |
| California State University Chico | mens | California Mens | NCR D2 | Lucas Bradbury |  |
| California State University Long Beach | mens | Gold Coast Mens | CRAA D1AA | Jason Reynolds | Longbeachrugby@aol.com |
| California State University Monterey Bay | mens | Northern California Mens | NCR D1 |  |  |
| California State University Northridge | womens | Pacific Desert Womens (8, spring) | CRAA D1 |  |  |
| California State University Sacramento | mens | California Mens | NCR D2 | Steve Seifert |  |
| Canisius College | mens | Upstate Small Mens | NCR SC |  | rugby@canisius.edu |
| Catholic University | mens | Mid-Atlantic Mens | NCR SC | Ian Macari | macari@cua.edu |
| Catholic University | womens | Independent Womens (2, fall) | NCR D1 | Abby Jackson | jacksonaj@cua.edu |
| Chico State University | mens | PAC West Mens | CRAA D1AA | Lucas Bradbury |  |
| Chico State University | womens | Pacific Mountain Womens (10, spring) | CRAA D1 |  |  |
| Coast Guard Academy | womens | New England Womens | CRAA D1 | Sarah Price | Sarah.E.Price@uscga.edu |
| College of Holy Cross | mens | NERFU Colleges Men | NCR SC | Brendan Wimberly | mensrugby@g.holycross.edu |
| College of St Scholastica | mens | Minnesota/Northern Lights Mens | NCR SC | Tyler Selleck | tselleck@css.edu |
| College of Wooster | womens | Ohio Valley Womens | NCR SC | Darlene Piper | dpiper@wooster.edu |
| Denver University | mens | Rocky Mountain Mens | NCR SC | Cody Melphy | cody.melphy@du.edu |
| East Stroudsburg | mens | Mid-Atlantic Mens | NCR D2 | Marcus Avery | pvtbigmac56@gmail.com |
| East Stroudsburg | womens | Eastern Penn Womens | NCR SC | Stephen Lynam | slynam@esu.edu |
| Eastern Conn State University | mens | NERFU Colleges Men | NCR D1 | Demetri Voukounas | dvouk22@gmail.com |
| Emory & Henry College | mens | Cardinals Mens | NCR SC | Tom O'neill | toneill@ehc.edu |
| Fresno State University | mens | PAC West Mens | CRAA D1AA | Lee Garrow |  |
| Fresno State University | womens | Pacific Mountain Womens (10, spring) | CRAA D1 | Michelle Maldonado |  |
| Geneseo College | womens | Upstate New York Womens | NCR SC | Colin Partridge | parcolin@aol.com |
| Hobart College | mens | Upstate Small Mens | NCR SC | Daniel Alexander | dg23alexander@gmail.com |
| Holy Cross College | womens | Allegheny Womens | CRAA D1 |  |  |
| Humboldt State University | mens | Northern California Mens | NCR D1 | Greg Pargee | thefooty1@gmail.com |
| Indiana University | mens | Big 10 Mens | CRAA D1A | Luke Gross | hoosierrugby@gmail.com |
| Iona College | mens | Liberty Rugby Mens | NCR D1 | Paul Burke | paul.burke140@gmail.com |
| Iowa Central CC | mens | NCR Independent Mens | NCR D1 | Brent Nelson | nelson_b@iowacentral.edu |
| IUPUI | mens | MAC Mens | CRAA D1AA | Joe Richards |  |
| IUPUI | womens | Great Lakes Womens | NCR D2 | Dakota Nelson | danels08@wsc.edu |
| Kenesaw State University | mens | SCRC Mens | CRAA D1AA | Randall Joseph | randall_joseph@bellsouth.net |
| Kent State University | womens | Allegheny Womens | NCR D1 | Hannah Henry | hhenry2@kent.edu |
| King's College | mens | Allegheny Mens | NCR D2 | Jan Kretzschmar | JanKretzschmar@kings.edu |
| Kutztown University | mens | Rugby East Mens | CRAA D1A | Dr Greggory Jones | greggajones@verizon.net |
| Kutztown University | womens | Eastern Penn Womens | CRAA D1 | VACANT - Alex Artus left for LIU Aug 2025 | kubears@kutztown.edu |
| LaSalle University | womens | Eastern Penn Womens | CRAA D1 | Kelsie McDowell | kmcdowell@lasalle.edu |
| Lasell College | mens | NERFU Colleges Men | NCR SC | Kristy Walter | kwalter@lasell.edu |
| Lewis and Clark College | womens | Cascade Collegiate Womens | NCR SC |  |  |
| Long Island University Brooklyn | womens | Northeast NIRA Womens | NIRA D1 | Alex Artus | alex.artus@liu.edu |
| Louisiana State University Baton Rouge | mens | Southern Collegiate Rugby Conference Mens | CRAA D1AA | Chris Reidel |  |
| Louisiana Tech | mens | Deep South Mens | NCR D1 |  |  |
| Lousiana State University | mens | SCRC Mens | CRAA D1AA | John Staub | 627llc@gmail.com |
| Loyola University | mens | Gold Coast Mens | NCR D1 | Ray Thompson | loyolarugby@gmail.com |
| Mass Maritime Academy | mens | Colonial Coast Men | NCR SC | Luigi Polizio | luigi.polizio@maritime.edu |
| Miami University Ohio | mens | Midwest Mens | NCR D2 | Wesley Seay | seaywj22@gmail.com |
| Miami University Ohio | womens | Ohio Valley Womens | NCR D1 | Catherine Maloney | malone36@miamioh.edu |
| Minnesota State University Mankato | mens | Minnesota/Northern Lights Mens | NCR D2 | Dustin Evans | alexcalliwehrman@gmail.com |
| Minnesota State University Mankato | womens | Northern Lights Womens | NCR D1 | Kelsy Swanson | kswanson720@gmail.com |
| Mississippi State University | mens | SCRC Mens | CRAA D1AA | Jason Posey | Jason_Posey@msn.com |
| Missouri Science & Technology | mens | Gateway Mens | NCR D2 | Daniel Boyd | dyobnad40@gmail.com |
| Molloy College | mens | Tri State Mens | NCR SC | Nick Agosti | mensrugby@molloy.edu |
| Molloy College | womens | Eastern Penn Womens | CRAA D1 | Samantha Byrne | rugby@molloy.edu |
| Moravian College | mens | Mid-Atlantic Mens | NCR D2 | Chris Ward | wardc02@moravian.edu |
| Mount St. Mary's University | mens | Chesapeake Mens | NCR D1 | Jay Myles | myles@msmary.edu |
| Nazareth College | mens | Liberty Rugby Mens | NCR D1 | Taye Daniel-Ayibiowu | tdaniel5@naz.edu |
| Neuman University | womens | Eastern Penn Womens | NCR SC | Kate Kneisly | kneislyk@neumann.edu |
| New Haven College | mens | NERFU Colleges Men | NCR D1 | Benjamin Brown | mensrugbyclub@newhaven.edu |
| Northern Illinois University | womens | Illinois Womens | NCR D1 |  | niwomensrugby15@gmail.com |
| Occidental University | mens | Gold Coast Mens | NCR D1 | Conrad Arjoon | arjoono@yahoo.com |
| Paul Smith's College | mens | Upstate Small Mens | NCR SC | Mark Buckley | buckleym@willex.com |
| Paul Smith's College | womens | New England Womens | NCR SC | Rebecca Romeo | rromeo@paulsmiths.edu |
| Penn State University Altoona | mens | Three Rivers Mens | NCR D1 |  | rugby@psu.edu |
| Penn State University Berks | mens | Mid-Atlantic Mens | NCR SC | Mark Dawson | mxd318@psu.edu |
| Penn State University | mens | Rugby East Mens | CRAA D1A | Zac Mizell | zmizell@psu.edu |
| Penn State University | womens | Big 10 Womens (8, fall) | CRAA D1 | Lauren Shissler | lshissler@psu.edu |
| Point Loma University | mens | Gold Coast Mens | NCR D1 | Dale Bergquist-Turori | dale.Turori@gmail.com |
| Prairie View A&M | mens | Lonestar Mens | NCR SC |  |  |
| Randolph Macon College | womens | South Atlantic Womens | NCR SC | David R. Marcussen | davidmarcussen@rmc.edu |
| Rio Grande University | mens | Allegheny Mens | NCR SC | Corey Momsen | cmomsen@rio.edu |
| Saint Joseph’s University | womens | Eastern Penn Womens | CRAA D1 |  |  |
| Saint Mary's College of California | mens | California Mens | CRAA D1A | Tim O'Brien |  |
| San Jose State | mens | PAC West Mens | CRAA D1AA | Nick Schlobohm |  |
| Southeastern Louisiana | mens | Deep South Mens | NCR D1 | Mark Dixon |  |
| Southeastern University of Louisiana | mens | Deep South Mens | NCR D1 | Mark Dixon | markdixon@charter.net |
| Southern Illinois University | mens | Gateway Mens | NCR D2 | Samuel Spangler | samuel.spangler@siu.edu |
| Southern Illinois University | womens | Illinois Womens | NCR D1 |  |  |
| St. John Fisher College | mens | Upstate Small Mens | NCR SC |  | rugby@sjfc.edu |
| St. John's University | mens | Minnesota/Northern Lights Mens | NCR SC | Dan Franklin | dfranklin@franklinoutdoor.com |
| St. Joseph's University | mens | Mid-Atlantic Mens | NCR D1 | MIKE WILLIAMS | MWILLIAMS@SJU.EDU |
| St. Mary's College of California | mens | California Mens | CRAA D1A | Tim Obrien | mensrugby@stmarys-ca.edu |
| St. Mary's College of Maryland | mens | Mid-Atlantic Mens | NCR SC | Maribeth Ganzell | mbganzell@smcm.edu |
| St. Michael's College | mens | New England Wide Mens | NCR SC | Bhuttu Mathews | bmathews@smcvt.edu |
| St. Vincent College | mens | Three Rivers Mens | NCR D1 | Mike Murphy | michael.murphy@stvincent.edu |
| Stephen F. Austin University | mens | Lonestar Mens | NCR SC |  |  |
| Stony Brook University | mens | Liberty Rugby Mens | NCR D1 | Jerry Mirro | rugbystonybrook@gmail.com |
| Stony Brook University | womens | Eastern Penn Womens | CRAA D1 |  | wrugby@stonybrook.edu |
| SUNY Albany | mens | Liberty Rugby Mens | NCR D1 | John Durant | ualbanyrugby@hotmail.com |
| SUNY Albany | womens | Eastern Penn Womens | CRAA D1 |  | wrugby@albany.edu |
| SUNY Binghamton | mens | Liberty Rugby Mens | NCR D1 | Brian Grills | bgrills@binghamton.edu |
| SUNY Binghamton | womens | Upstate New York Womens | NCR D1 | Rene Walker | bingwomensrugby@gmail.com |
| SUNY Buffalo | womens | Upstate New York Womens | NCR D1 | Raymond Ignasiak | raymondignasiak@gmail.com |
| SUNY Fredonia | mens | Upstate Small Mens | NCR SC | Rob Beck | rugby@fredonia.edu |
| SUNY Fredonia | womens | Upstate New York Womens | NCR SC | Halie Booth | hbooth@fredonia.edu |
| SUNY Oneonta | womens | Upstate New York Womens | NCR SC | Alexis Fuda | fudaam85@oneonta.edu |
| SUNY Plattsburgh | womens | Upstate New York Womens | NCR SC |  | rugby@plattsburgh.edu |
| SUNY Stony Brook | mens | Mid-Atlantic Mens | NCR D2 | Jerry Mirro | rugbystonybrook@gmail.com |
| Tennessee Tech | mens | South Central Mens | NCR D1 | Joseph Domenico | jwdomenico42@tntech.edu |
| Texas A&M Corpus Christi | mens | Lonestar Mens | NCR SC |  |  |
| Texas Tech University | womens | Texas Womens (11, fall) | CRAA D1 |  |  |
| The Citadel Military College | mens | Southern Rugby Conference Mens | NCR D2 | Bill Bell | rugby@citadel.edu |
| The Citadel Military College | womens | South Atlantic Womens | NCR SC | Mary-Ellen Huddleston | mary.huddleston@citadel.edu |
| The College of New Jersey | womens | Eastern Penn Womens | CRAA D1 | Eddie Taurez | wrugby@tcnj.edu |
| Tiffin University | womens | Ohio Valley Womens | NCR SC | Aleixis McMullen | massic@tiffin.edu |
| Truman State University | womens | Mid-America Women | NCR SC | Hannah Senay | hcs8375@truman.edu |
| UC Davis | womens | Pacific Mountain Womens (10, spring) | CRAA D1 |  |  |
| UC Los Angeles | womens | Pacific Desert Womens (8, spring) | CRAA D1 |  |  |
| UC San Diego | womens | Pacific Desert Womens (8, spring) | CRAA D1 |  |  |
| UC Santa Barbara | womens | Pacific Desert Womens (8, spring) | CRAA D1 |  |  |
| Union College | womens | Upstate New York Womens | NCR SC | Mark Peeney | mpeeney@gmail.com |
| United States Merchant Marine Academy Kings Point | mens | Tri State Mens | NCR D2 | Bradford Lawrence | blaw142@gmail.com |
| University of Alabama Birmingham | mens | Deep South Mens | NCR D2 | Cj Williams | cjwilliams88@gmail.com |
| University of Alabama Huntsville | mens | Deep South Mens | NCR D2 |  | uahrugby@uah.edu |
| University of Arkansas | womens | Mid-America Women | NCR D1 | Allison Hayes | wrugby@uark.edu |
| University of Auburn | mens | SCRC Mens | CRAA D1AA | Buffy Terrell | mam0269@auburn.edu |
| University of Buffalo | mens | Liberty Rugby Mens | NCR D1 | Owen Lawther | ubrugby@buffalo.edu |
| University of California Berkley | mens | PAC Mens | CRAA D1A | Jack Clark | clarkj@berkeley.edu |
| University of California Berkley | womens | Pacific Mountain Womens (10, spring) | CRAA D1 | Kate Brown | katherinebrown@berkeley.edu |
| University of California Davis | mens | California Mens | CRAA D1A |  |  |
| University of California Los Angeles | mens | PAC Mens | CRAA D1A | Harry Bennett | hbennett@recreation.ucla.edu |
| University of California Santa Barbara | mens | California Mens | CRAA D1A | Neil Foote | ucsbrugbycoach@gmail.com |
| University of California Santa Clara | mens | PAC West Mens | CRAA D1AA | Paul Keeler | pkeeler@scu.edu |
| University of California Santa Cruz | mens | PAC West Mens | CRAA D1AA | Jeremy Sanford |  |
| University of Colorado | mens | Rocky Mountain Mens | CRAA D1A | Murray Wallace |  |
| University of Georgia Tech | mens | SCRC Mens | CRAA D1AA | Chris “Macon” Carter | carter421@gmail.com |
| University of Georgia | mens | SCRC Mens | CRAA D1AA | Mick Costa | ugarugby@uga.edu |
| University of Health Sciences & Pharmacy | mens | Heart of America Mens | NCR SC | Peter Lang | peter.lang@uhsp.edu |
| University of Houston (7s only) | womens | Texas Womens (11, fall) | CRAA D1 |  |  |
| University of Illinois | mens | Big 10 Mens | CRAA D1A | Joe Rasmus |  |
| University of Illinois | womens | Illinois Womens | NCR D1 | Tina Targia | ctargi2@illinois.edu |
| University of Indiana | womens | Big 10 Womens (8, fall) | CRAA D1 | Vaughn Mitchell |  |
| University of Louisiana Lafayette | mens | Deep South Mens | NCR D1 | Bill Goodell | bill@goodelllaw.com |
| University of Maine Farmington | mens | NERFU Colleges Men | NCR D1 | Nathan Schultz | nathan.schultz@maine.edu |
| University of Maine Farmington | womens | Colonial Coast Womens | NCR SC | Jake Hanstein | hanstein.j@gmail.com |
| University of Maine Orono | mens | NERFU Colleges Men | NCR SC | Dale Russell | dale.russell@maine.edu |
| University of Maine Orono | womens | New England Womens | CRAA D1 |  | umainerugby@maine.edu |
| University of Maryland Baltimore County | mens | Mid-Atlantic Mens | NCR D2 | Cordell Drummond | cdrummond7@gmail.com |
| University of Minnesota Moorhead | womens | Great Waters Womens | NCR SC |  |  |
| University of Minnesota | mens | Heart of America Mens | CRAA D1AA | Paul O'Brien |  |
| University of Missouri Columbia | mens | Heart of America Mens | CRAA D1AA | Don Corwin | clubmensrugby@mizzourec.com |
| University of Missouri Kansas City Volker Campus | mens | Gateway Mens | NCR D2 |  |  |
| University of Nevada Reno | mens | PAC West Mens | CRAA D1AA |  |  |
| University of New England | mens | NERFU Colleges Men | NCR D1 | Chris Broere | cbroere@une.edu |
| University of North Carolina Chapel Hill | mens | Southern Rugby Conference Mens | NCR D2 | Joey Rasmus | rasmus@unc.edu |
| University of North Carolina Chapel Hill | womens | Blue Ridge Womens (8, spring) | CRAA D1 | Mac Zara | maczara@unc.edu |
| University of North Carolina Charlotte | mens | Southern Rugby Conference Mens | NCR D2 | Robert McCachren | rmccachr@charlotte.edu |
| University of North Carolina Charlotte | womens | Southern Rugby Conference Womens | NCR D2 |  | unccwomensrugby@gmail.com |
| University of North Carolina Greensboro | mens | Southern Rugby Conference Mens | NCR SC | Steve Guido Ackrish | guido1864@yahoo.com |
| University of North Carolina Greensboro | womens | South Atlantic Womens | NCR D1 | Kaitlin Smith | kadenmsmith99@gmail.com |
| University of NorthTexas | mens | Red River Mens | CRAA D1A |  |  |
| University of Oklahoma | womens | Texas Womens (11, fall) | CRAA D1 |  |  |
| University of Pittsburgh Johnstown | mens | Three Rivers Mens | NCR D1 | Jedidiah Elam | jee61@pitt.edu |
| University of Tennessee Chattanooga | mens | South Central Mens | NCR D1 |  |  |
| University of Texas (Austin) | womens | Texas Womens (11, fall) | CRAA D1 |  |  |
| University of Texas Dallas | mens | Lonestar Mens | NCR SC |  |  |
| University of Texas El Paso | mens | Lonestar Mens | NCR SC |  |  |
| University of Texas San Antonio | mens | Texas Womens (11, fall) | CRAA D1 |  |  |
| University of Texas | mens | Red River Mens | CRAA D1A | Van Stewart |  |
| University of Wisconsin Eau Claire | mens | Great Midwest Mens | NCR SC | Ross Schultz | schultrj0828@uwec.edu |
| University of Wisconsin Eau Claire | womens | Great Waters Womens | NCR D1 | Derek Wagner | djwag99@gmail.com |
| University of Wisconsin La Crosse | womens | Great Waters Womens | NCR D1 | Sydney Raymond | raymond2037@uwlax.edu |
| University of Wisconsin Madision | womens | Midwest Womens | NCR D1 | Helena Wehrs | hwehrs@wisc.edu |
| University of Wisconsin Madison | mens | Big 10 Mens | CRAA D1A | Kurtis Sheperd | kurtiswshepherd@gmail.com |
| University of Wisconsin Milwaukee | mens | Great Midwest Mens | NCR D2 | Bryce Zacharias | zachar25@uwm.edu |
| University of Wisconsin Oshkosh | womens | Great Waters Womens | NCR D1 | Alex Petrie | alexpetrie050601@gmail.com |
| University of Wisconsin Platteville | mens | Great Midwest Mens | NCR D2 | Kanen Getz | kjgetz29@gmail.com |
| University of Wisconsin Platteville | womens | Great Waters Womens | NCR SC | Patrick Harrington | uwpwomensrugby@gmail.com |
| University of Wisconsin Stevens Point | mens | Great Midwest Mens | NCR SC | Joe Kastel | joe.kastel29@gmail.com |
| University of Wisconsin Stevens Point | womens | Great Waters Womens | NCR D1 | Drea Ilana | drearock104@gmail.com |
| University of Wisconsin Stout | mens | Minnesota/Northern Lights Mens | NCR SC | Evan Cwiekowski | cwiekowskie6695@my.uwstout.edu |
| University of Wisconsin Stout | womens | Great Waters Womens | NCR SC |  |  |
| University of Wisconsin Whitewater | mens | Great Waters Womens | NCR D1 | Matt Schneider | schneidemd30@uww.edu |
| University of Wyoming | womens | Rocky Mountain Womens (10, fall) | CRAA D1 |  |  |
| Ursinus College | womens | Eastern Penn Womens | NCR SC | Max Friel | maxwell.friel@gmail.com |
| Utah State University | womens | Rocky Mountain Womens (10, fall) | CRAA D1 |  |  |
| Utah Valley University | womens | Rocky Mountain Womens (10, fall) | CRAA D1 |  | womensrugbyclub@aggies.usu.edu |
| Virginia Millitary Institute | womens | South Atlantic Womens | NCR SC | Suzanne Rubenstein | rubensteinsd@vmi.edu |
| Virginia Polytechnic Institute | mens | Chesapeake Mens | NCR D1 | Collin Weigert | collin35@vt.edu |
| Virginia Tech | womens | Blue Ridge Womens (8, spring) | CRAA D1 | Callie Houston | hcallie21@vt.edu |
| Washington and Lee University | mens | Cardinals Mens | NCR SC | Brian Moynahan | moynahanb22@mail.wlu.edu |
| Washington University of St. Louis | womens | Mid-America Women | NCR D1 | Anne Seul | anneseul@wustl.edu |
| Washington University | mens | Gateway Mens | NCR D2 | Liam Mulkerin | liam.mulkerin@wustl.edu |
| Wentworth Institute of Techonlogy | womens | Colonial Coast Womens | NCR SC | Ayla Axeloons | ajaxeloons@gmail.com |
| Wesleyan University | womens | New England Womens | CRAA D1 |  | wrugby@wesleyan.edu |
| West Chester University | mens | Mid-Atlantic Mens | NCR D1 | Bjorn Haglid | bjornhaglid@gmail.com |
| West Chester University | womens | Mid-Atlantic NIRA Womens | NIRA D2 | Tony DeRemer | tderemer@wcupa.edu |
| Western Illinois University | womens | Illinois Womens | NCR SC | Kayla Curless | km-curless@wiu.edu |
| Western Michigan University | womens | Great Lakes Women | NCR D1 | Frederic Reed | oderffredo@gmail.com |
| Westfield State University | womens | New England Womens | CRAA D1 |  | rugby@westfield.ma.edu |
| Wheaton College | womens | Colonial Coast Womens | NCR SC | Derek Jenesky | djenesky@brandeis.edu |
| Whitman College | womens | Cascade Collegiate Womens | NCR SC |  |  |
| Widener University | womens | Eastern Penn Womens | NCR SC | Danna Kutchner | dmkutchner@widener.edu |
| Willamette University/Reed College | mens | Northwest Mens | NCR SC | San Juanita Fetuuaho |  |
| Willamette University | womens | Cascade Collegiate Womens | NCR SC | Niamh Sheehy | nasheehy@willamette.edu |
| William Patterson University | mens | Tri State Mens | NCR D2 | John Russo | rugby@wpunj.edu |
| William Smith | womens | Eastern Penn Womens | CRAA D1 | Emma Stuart | emma.stuart@hws.edu |
| Williams College | womens | New England Womens | CRAA D1 |  | rugby@williams.edu |
| Winona State University | womens | Midwest Womens | NCR D1 | Ed Mcbride | edmcbride70@gmail.com |
| Wooster College | womens | Allegheny Womens | NCR SC |  |  |
| Worcester Polytechnic Institute | womens | New England Womens | CRAA D1 | Elizabeth Casey | lkc89@wpi.edu |
| Youngstown State University | womens | Allegheny Womens | NCR D1 |  | ysuwomensrugby17@gmail.com |