# Positive Physics Solver
**If you looked this up, *shame*.**

If you looked this up you would also find the old one from 2019 made by some guy who had a bookmarklet. 

I have no connection to the guy, just thought it was interesting no one made a positive physics hack in such a long time. However, do gotta give him props for obfuscation. It took me a whole 5 minutes to deobfuscate.

# Usage
Extension: Tampermonkey.

Paste the **script.js** in a new script tab and go to a <u>***new problem***</u>.

# TROUBLESHOOTING
Because the creators are smart, they have security 🤯🤯🤯🤯🤯🤯🤯

TL;DR: IF NOTHING SHOWS: Only works on <u>***new problems***</u>.
 - Extra Practice: Finalize, restart.
 - Work: No clue. I don't think you can reset, so just start the script before entry.
 - Assesment: ¯\\\_(ツ)_/¯

## small rant 
They have the questions made server side, but sent to client? The bookmarklet I talked about at the start, used the answerValues which I am assuming is their old code which checked client side (horrible mistake). However, they now have the answerValues client side for a split second, hashed and sent off to the server, then wiped completely. Unless I'm stupid, sending answerValues to client serves no purpose, and since they compute the instructions for answerValues serverside in order to send to client, they could also hash serverside?? This hack is soooooo rudementary, hell it's like a div with a for loop for the answers. The hardest part was hooking the script on page load, but thats why I love Tampermonkey. why did i make this? i got bored

### side note
They have a whole essay in their code to get rid of this. 
*(I found some other comments, and I think this was in the todo since 2019? aka same year the other guy had his stuff patched)*
![todo: never](image.png "Todo: Never")