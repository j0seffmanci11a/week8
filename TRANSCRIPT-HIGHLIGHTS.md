##  TRANSCRIPT-HIGHLIGHTS

### 1. planning + initial code (session 1)
Before I asked claude to make any code, I had it look over the landing page to make a basic list app with the same css style, 
and I wanted to work in chuncks and not overwhelm the AI at the begining

I then asked for it too add some of the basic, core features, before looking it over and editing the css and parts of the html
to how I want it

### 2. adding the bulk (session 1)
With this section, I asked the AI for some slightly more demanding task, like having it help create the CRUD and localStorage implementation to save in the browser, wanting something simple, basic, and not to time consuming, and asked to find any errors that would conflict with my code

Then I had the AI check, along with myself, to check for any bugs, or anything broken, and it found and I review the error and allowed the AI to fix the error: 
critical-\### 1. Timer Input Validation Missing
medium-\### 2. Calendar "No tasks" Text Not Using CSS Variables Properly, \### 3. No Confirmation for Empty Task Input
minor- \### 4. Task Notes Preview Truncates Mid-Word, \### 5. Modal Timer State Not Fully Reset Between Tasks, \### 6. No Error Handling for localStorage Quota Exceeded, \### 7. Calendar View Doesn't Show Tasks Without Due Dates, \### 8. Inline Styling Inconsistency
and with the critical errors, I made the Ai check again just for clarity, while for the medium and minor errors, I edited some of them myself. 

I then asked, to add a timestamp for the list and asked again for any bugs or fixes and reviewed them manually,
the error messages that I got wern't as bad as the inital errors but the erros that I got were:
critical- \### 1. Grammatically Incorrect Hero Text
potental- \### 2. Old Tasks Missing createdAt Field, \### 3. Date Comparison Edge Case
and I asked the AI to check to see if the potental errors could become an issue later, as I manually fixed the "critical" error, which was a gramatical error. 

I finally asked to create a button and tab to better view the timer

### 3. near the end (session 2)
I asked to compact the chat, as I was getting near the limit and to recheck for bugs and errors that was cancled by the compact  of the initial chat, and I then manually edited some of the bugs/errors found and review/edited the code for anything looking incorrect.
It found some design bugs involving the timer page and it not recording the time and allowing for negative time to be inputed into the timer, I then ask for multipule ways to fix the bug and it gave me three ways to fix them