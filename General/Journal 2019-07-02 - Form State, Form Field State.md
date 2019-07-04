Journal 2019-07-02 - Form State, Form Field State
========

Um.  Something like...?

- Read Only - Used to just display the form values, allow selection and copying, but not allow changing.
- Read-Write - Usual interactive mode.
- Pending - Server Side Validation and waiting for the submit request to complete.
- Submitted - Form was successfully submitted.  Not sure if this should be a separate state or if it should just go back to Read Only.
    - Submit-Success makes more sense as an event than a state, I think.  An Event rather than a Behavior in FRP parlance.

That only covers one aspect, though.  It may be helpful to look at existing form libraries, particularly things like Redux Form, to see what all aspects they cover.

Other things I can think about:

- Clean/Dirty - Has the User changed any values?
- Untouched/Touched - Has the User focused on any fields?
- Valid/Invalid - Are all fields valid or any invalid?
    - Or maybe Untouched/Valid/Invalid?  Or does that overlap too much with Untouched/Touched?
    - Usually the form will begin life Invalid, because usually there's at least one Required field.  However, when Untouched it should not render any errors.
        - Or, more specifically, it should not render any errors for any Untouched Fields.
