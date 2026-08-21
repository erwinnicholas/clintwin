1. Add patients as batch xlsx and text docs with the format given all columns and the text data should follow the parsing data

a single CSV and a text document PDF will have Patient ID and Data you will parse and store the data in the database the facilites for both data to be uploaded in steps the UI properly the uploaded data must be shown and validated create a strict format used to bind text in PDF or other documents and use it from the start not all patients need text

show the data in the space in patient data and add a button to confirm upload and skip error prone rows and generate PID properly order don't mix the text data with other patients maintain validity using any specific formats to hold them together

After this the UI must show the correct number of patients in the patient page and dashboard page and wherever called these patients are the overall patients not the ones selected for a trial


2. Create Trials in the trial page upload inclusion, exclusion CSV rules and Text data PDF where both are necessary and text data rules is optional but may be uploaded so both for a single test

show the parsed rules in the UI and the notes parsed and neatly displayed before confirming. Store it with trial ID.

3. Start Trial button in the trial page component

After clicking this button 

it asks select patients for trial button when approved the patient selection with the selection filter starts and proceeds

after the 2 filters it shows the list of patients selected and rejected and the UI must have a button saying explain decision for each row of patient displayed 

when clicked if rejected by the rules it uses a predefined template to explain else if by vector and phase 2 filter notes the LLM generates with the notes fed into its context dynamically at that time.

After that we show the start trial button use the eligibility criteria page make sure not to remove or edit the UI structure only text in the UI must be edited

An upload for the 6 month data is shown then it is uploaded after uploading we show those who are eliminated if they have erratic or broken reports

we split 3 groups right now the UI doesn't support it make sure to show it without breaking the UI and proceed with showing the Fitness test results saying the groups are equivalent and tests made will be proper

after that digital twin is created and orchestrated, charts initialized and made ready for monitoring

it asks for test 1 data we provide it and it evaluates it and shows a button Forecast next test, predicts the future states of the participants for the next test and shows expected output

then we upload test 2 data compares with the current data shows errors does simple error calculations and charts for those and in all these steps there will be a button called explain where the LLM call is hooked and all context is dynamically uploaded with only necessary details depending on which is asked to be explained and shown plan to first finish UI then focus on the LLM finally

we do these cycles and timesteps for as much as required

4. End Test provieds with the report and compiles patient data all the time step decisions made logs everything computer generated and if any explanations generated add those and give it as a complete output in PDF with all numerics and numerics separate in csv with proper split data

charts must be downloadable or auto downloaded on click in the download button in charts and so on if possible embed in the PDF that is for the final phase not important

5. Complete everything clear the tests delete free patients from the test thats it.




total files generated

1. patient data csv
2. patient data text/ due to time constraints generate an alternative csv with the column wiht text
3. trial rules csv
4. trial rules text/  due to time constraints generate an alternative csv with the column wiht text
5. 6 month patient data csv
6. simulation data generated and feed directly to the system


so files accessible or given to the user in the data generator page 1,2,3,4,5 and the extra 2 csv total 7