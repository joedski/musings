Journal 2022-02-18 - Dynamically Generating Robot Tests on the Fly
==================================================================

1. Release Notes for 2.8: https://code.google.com/archive/p/robotframework/wikis/ReleaseNotes28.wiki#Public_API_for_generating_and_executing_tests
    1. Issue Referenced: https://code.google.com/p/robotframework/issues/detail?id=825
    2. [TestSuite API Doc](http://robot-framework.readthedocs.org/en/latest/autodoc/robot.running.html#robot.running.model.TestSuite)
    3. [TestSuiteBuilder API Doc](http://robot-framework.readthedocs.org/en/latest/autodoc/robot.running.html#robot.running.builder.TestSuiteBuilder)

I think `TestSuite` and `TestSuiteBuilder` are what I saw prior, though it seems like youhave to run a Python script that uses those before you run Robot, or at least I didn't see a way to create a Robot key word that generated those tests at test run time and thus generated then executed them all in the same process.
