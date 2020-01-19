Journal 2019-11-26 - Adding Menus to DevilutionX
=======

So, I'd like to try out working [this issue, being able to play Single Player in Nightmare or Hell difficulty](https://github.com/diasurgical/devilutionX/issues/69).  There are 2 main parts that I can see:

1. User must be able to select difficulty.
2. More importantly, that selection must be persisted in the save file.

There's already [some thoughts](https://github.com/diasurgical/devilutionX/issues/69#issuecomment-533922177) about how to do 2, with that project member's preference being their first suggestion: hiding the data in the alignment bytes of the save format.  If I actually get that far, I'll probably go for that because difficulty shouldn't be too difficult.



## Studying the Existing Menus

For now, I just need to learn how the menu system works.

I did a bit of a tour last time while muttering to myself how the code style wasn't what I'm used to so I didn't like it because it's ~~inferior~~ not what I'm used to.  (I mean, honestly, I do think the formatting is haphazard, but also honestly, I can't bring myself to care that much, and doing a reformatting pass on the code base would muck up all the commit history.)  So I got a vague idea of how it works.  Should be a bit easier to step into.

Now I'm going to document my journal a bit ~~more fully~~ less non-fully.

> Aside: The file organization of the actual repo is actually not annoying, while in the Xcode project everything is for whatever reason just in one ~~folder~~ group.  At least they're separated by build target, but good golly is it non-obvious what's where.

> Note: For consistency reasons, these are linked to [commit 62ddeef](https://github.com/diasurgical/devilutionX/tree/6d22eefd414b8506b46696d31a6404b3d704b6d6).

- As noted last time, the entrypoint [is `int main(int argc, char **argv)` which, strangely enough, is in a file named `main.cpp`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/main.cpp#L28-L37).
- A [bunch of initialization stuff happens](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/diablo.cpp#L302-L303), and eventually we end up at [`Source/mainmenu.cpp:87`, `void dvl::mainmenu_loop()`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/mainmenu.cpp#L87-L128).

This function does a few things:

- Declares some variables: `BOOL done` and `int menu`.
    - `done` gets initialized to `FALSE`.
- Starts the main menu music.
- Enters the eponymous menu loop.

In that loop, the following occurs:

- `menu` is initialized to `0`.
- Its address is passed to [`BOOL dvl::UiMainMenuDialog(char *name, int *pdwResult, void (*fnSound)(char *file), int attractTimeOut)`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L60-L79) in the `pdwResult` parameter.
    - `name` there is set to the Product Name ([`char dvl::gszProductName[]`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/init.cpp#L23))
    - `fnSound` which I'd surmise is some menu sound playing function is set to [`void __stdcall effects_play_sound(char *snd_file)`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/effects.cpp#L1236-L1252), which looks more like a [general sound](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/effects.cpp#L16) playing function than anything.  So, uh, it's probably that?
    - And lastly, `attractTimeOut` which is the timeout that switches to attract mode when it elapses.
        - Of note, it's in seconds, as it's assigned directly to [`int dvl::mainmenu_attract_time_out`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L6) which has a helpful comment noting that unit.
        - The currently passed value is 30, so there's that.
- So, `dvl::mainmenu_attract_time_out` gets set, then [the function two definitions up](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L39-L53) is called to actually load the menu.
    - Finally, the sound function is chucked [somewhere](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/diabloui.cpp#L39),
    - then the last item in [`UiItem dvl::MAINMENU_DIALOG[]`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L17-L22) has its [`.art_text.text` (`const char *text`)](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/ui_item.h#L134) set to the `char *name` pointer, putting that finally into the actual menu proper.
        - Aside: Interesting way of abstracting around different items in C++.  Granted, that coming from a higher-level language nubbin like me.
    - The user selection [`int dvl::MainMenuResult`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L9) is initialized to 0.
    - Different background art is [loaded](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/diabloui.cpp#L497-L508) based on whether or not this is using the Spawn/Shareware data or not.
    - And finally, the UI itself is [initialized](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/diabloui.cpp#L69-L96).
        - While it's interesting to look deeper there, mainly it's just that it inits a bunch of menu list selection state and callbacks and, if an item is an edit item (`.type == UI_EDIT`), does a bit of extra initialization including setting the current edit pointer and length.
    - After all that, the attract timeout is converted to a tick offset 1000 ticks times the attract timeout seconds after the current tick count.
    - Curious note: if you hit escape on the main menu, [the menu selection is set to `MAINMENU_EXIT_DIABLO`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L29-L32).  That of course [allows the logic to exit the main menu loop](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/mainmenu.cpp#L121-L123) and thus exit the game.
- And then at long last the menu loop is entered, waiting until the [`MainMenuResult`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/mainmenu.cpp#L9) is something other than 0.
    - This consists of [sitting around waiting for events, redrawing in response](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/SourceX/DiabloUI/diabloui.cpp#L542-L551), and checking if the attract timeout has elapsed (and bailing with `MAINMENU_ATTRACT_MODE` if so).

So, weird to someone like me used to a high level event driven and object-happy system like JS, but ultimately not that weird upon further inspection.

There's not really that much to the menus themselves.  The next point of interest here is if the user [selects either `MAINMENU_SINGLE_PLAYER` or `MAINMENU_MULTIPLAYER`](https://github.com/diasurgical/devilutionX/blob/6d22eefd414b8506b46696d31a6404b3d704b6d6/Source/mainmenu.cpp#L101-L108)


### Okay, But Where Are The Player Menus?

So one thing that perplexed me but I wasn't awake enough to note down last night was: I can see the main menu selection stuff, but where's the SP/MP menu stuff?

As part of this, it may help to actually note the high level interaction from the stand point of playing the game itself:

- Launch game
- Intro video plays
- Title Screen Shows
- Main Menu shows, BGM plays
- User Action: select Single Player
    - Fade to Single Player Characters screen, with hero info and Select Hero box.
    - Canceling or hitting Escape here goes back to the Main Menu.
    - User Action: select (Existing Hero)
        - Change to Save File Exists menu with options Load Game and New Game.
        - Hitting Escape or clicking Cancel takes User back to Single Player Characters screen.
- User Action: select Multi Player
    - Fade to Multi Player Game screen, with Select Connection menu and helpful info.

So where are those being handled?

> I keep hitting F12 to try to Go To Definition.  Xcode doesn't have that as the shortcut, it uses Cmd-Ctrl-J, or Cmd-Ctrl-Click as the default binding.

So that's pretty obvious, but of course the way the initial code is done is still very weird/new to me.  Let's go by call stack I guess.  This is gonna be pretty indented with 4-spaces per indent...

- Launch game: Bunch of setup happens.
- `dvl::WinMain(HINSTANCE, HINSTANCE, LPSTR, int)`:
    - `dvl::diablo_init(LPSTR)` to do inity stuff.
    - `dvl::diablo_splash()` to show the splishy splashy (but only for non-shareware users)
        - `dvl::UITitleDialog()` after the actual intro videos, to show the splash screen before the main menu.
        - `dvl::mainmenu_loop()` to enter the actual main menu and gameplay loo.
            - `BOOL dvl::UiMainMenuDialog(char *, int *, void (*)(char *), int)`
                - `dvl::mainmenu_load(char *, void (*)(char *))`
                    - `dvl::UiInitList(int, int, void (*)(int), void (*)(int), void(*)(), UiItem *, int, bool, bool (*)())` to load up the current main menu UiItem list.
                - `dvl::UiPollAndRender()`
                    - Wait for an event from `SDL_PollEvent(&event)` then pass it to `dvl::UiFocusNavigation(SDL_Event *)`.
                        - Get a `dvl::MenuAction` for the given event using `MenuAction GetMenuAction(const SDL_Event &)`.  Probably the most relevant to the current use case is `dvl::MenuAction::Select` which here gets mapped to...
                        - `void dvl::UiFocusNavigationSelect()`.
                            - Plays the Selection sound, cancels any active text input, then calls the callback `void (*dvl::gfnListSelect)(int)`.  That was inited back in the `mainmenu_load` call to `void dvl::UiMainMenuSelect(int)`, and currently all that does is set `int dvl::MainMenuResult = value`.
                        - When we no longer have any events to handle, we move on to `void dvl::UiRenderItems(UiItem *, std::size_t)` to redraw things by calling `void dvl::RenderItem(UiItem *)` for each one.
                        - Then we draw the mouse with `void dvl::DrawMouse()`
                        - And lastly update the current fade-in with `void dvl::UiFadeIn()`.
                - And that all loops until `int dvl::MainMenuResult` finally changes to something other than 0, meaning the User selected something or otherwise did something to call `void dvl::UiMainMenuSelect(int)`.
                    - At that point, the main pallet is blacked out with `void dvl::BlackPallet()` and the main menu is freed with `void dvl::mainmenu_Free()` (which currently just unloads one thing).
                - Finally, it returns `true`.
            - We finally got something in our `menu` variable, so time to do the things with that.  Let's go with `MAINMENU_SINGLE_PLAYER` for now.
                - Enter `BOOL dvl::mainmenu_single_player()`, which sets `BYTE dvl::gbMaxPlayers` to 1 (because it's single player) and call `BOOL dvl::mainmenu_init_menu(int)` with `SELHERO_NEW_DUNGEON` as the argument, returning whatever it returns.
                    - `void dvl::music_stop()` to do just that.
                    - `BOOL dvl::StartGame(BOOL bNewGame, BOOL bSinglePlayer)` to enter into the next menu system?  And main loop, it looks like, since once that exits `mainmenu_single_player()` also exits, refreshing the music if it exited with a success status.
                        - `BOOL dvl::NetInit(BOOL, BOOL *)` to init network stuff, which is done for single and multiplayer.  Interesting.
                        - A bunch of init stuff (Levels, Quests, Dungeons, DungMsgs...) if it's a new game or there's no valid save files.
                        - Then `void dvl::run_game_loop(unsigned int uMsg)`
                            - Aaaand that's where I abruptly get lost.

> Other notes:
>
> - stdlib's `int atexit(void (*func)(void))` for cleanup calls.  Neat!

So, I get as far as `run_game_loop` then... blurp.  Not quite sure where to go through there.  I guess I'll just have to step through everything.

Another thought is to maybe look for other menu data and see where it's being referenced.  All Specific Data, which includes things like specific menus, is either config or hard coded, and for the most part Diablo's menus look to be hard coded.  Either way, they're somewhere and need to be loaded from somewhere.

The question is, do character/network select and in-game menus use the same UI system?  And if that's the case, can I just breakpoint `dvl::UiInitList(...)` and checkout the call stacks from there?  Initializing a menu seems to be a one-time thing per menu usage, with the rest of the time spent waiting for events.  It's worth a shot, certainly, but assumes that that's the function used elsewhere as well.
