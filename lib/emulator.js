/*
 * WITCH-E emulator core (UI stripped)
 * Extracted from technobaboo/witch-e, emulator.js ("WITCH-E v2.0.0").
 *
 * REMOVED: the Enyo/Moonstone UI. That is the enyo.kind wrapper, the whole `components` tree
 * (tape readers, Straight/Looped buttons, log, printer, store grid, alarm/finish lights), CSS class
 * toggling, and the enable/disable of widgets while running.
 *
 * KEPT AS-IS: everything else, bugs included, so behavior can be characterised before porting.
 * This file is NOT runnable. The logic still reads and writes machine state through the UI seams below.
 *
 * UI SEAMS still referenced by the logic (each `this.$...` used to be an Enyo component):
 *   this.$["num1".."num4"]       get/set("value")    tape reader text; the tape advances by rewriting it
 *   this.$.log                   get/set("value")    process log text
 *   this.$.printer               get/set("content")  printer output text
 *   this.$["09"], this.$["10".."99"]  get/set("content")
 *                                accumulator (16 digits) and stores (9 digits), addressed dynamically
 *                                from command digits, e.g. this.$[commandStr.slice(3, 5)]
 *   this.$["090"]                used by the sign tests on 08/09, but no such component ever existed
 *                                (likely meant "09"), so those tests would throw
 *   inSender                     event source in loopIt / handleChange (.name is "button1-4" / "num1-4")
 *   enyo.job, enyo.bind          timers that drive execution (1506 ms per command,
 *                                712 ms per block-marker search step)
 *   enyo.log                     logging
 *
 * Also note: `g` and `curTapeReader` are assigned without being declared (implicit globals),
 * which throws in strict mode, i.e. inside ES modules / TypeScript output.
 */
var curCommands = [];
var runForTheFirstTime = false;
var straight = [true, true, true, true, true];
var foundBlkMarker = false;
var x = 0;
var i = 0;
var s = 0;
var t = 0;
var ss = false,
  sss = false;
var cmdString, cmdString2;
var rawCurCommands = "";
var prevText = "";
var tpr = [];
var mainWindow;
var blkNum = 0;
var curTpr = 0;
var stbCurTpr = 1;
var TimeToWait;
var ranAlready = false;
var stores = [];
var looped = [false, false, false, false, false];
var done = false;
var storedValue = null;
var tprPositions = [0, 0, 0, 0, 0];
var outcomeToBePrinted = null;
var tapeValues = [];
String.prototype.replaceAt = function (index, character) {
  return this.substr(0, index) + character + this.substr(index + character.length);
};
function between(x, min, max) {
  return x >= min && x <= max;
}
var emulatorMain = {
  loopIt: function (inSender, inEvent) {
    straight[parseInt(inSender.name.slice(6)) - 1] = !straight[parseInt(inSender.name.slice(6)) - 1];
    // UI removed: button label ("Straight"/"Looped") update and looped[] write
    console.log(inSender.name + "  is changed");
  },
  create: function () {
    stores["9"] = "0000000000000000";
  },
  handleChange: function (inSender, inEvent) {
    inSender.set("value", inSender.get("value").replace(/(\n)+/gi, "\n"));
    if (inSender.name == "num1") {
      curCommands = inSender
        .get("value")
        .replace(/\n(\+|-|\*)/gi, "$1")
        .replace(/\n\[[0-9]\]/gi, "")
        .split("\n");
      for (i = 0; i < curCommands.length; i++) {
        //curCommands[i].replace(/(<.{1,4}>)+/ig, "");
        if (curCommands[i] == "") {
          curCommands.splice(i, 1);
        }
      }
    }
    enyo.log(curCommands);
    tpr[parseInt(inSender.name.substring(3)) - 1] = inSender.get("value");
    tapeValues = tpr;
    console.log(tpr + " : " + curCommands);
  },
  execCommands: function () {
    prevText = this.$.log.get("value");
    if (curCommands[0].length != 3 && curCommands[0].length != 5 && curCommands[0].length != 14) {
      curTapeReader = "";
      this.$.log.set(
        "value",
        prevText +
          "Error: This Command/Block Marker must be 3 or 5 or 9 characters long with a plus/minus included, ex. [1], [2], 21000 or 10110\n+12345678",
      );
    } else {
      curTapeReader = "";
      if (runForTheFirstTime) {
        this.evaluate();
      } else {
        done = true;
        blkNum = "1";
        stbCurTpr = "1";
        this.searchForBlkMarker();
      }
      done = false;
    }
    return false;
  },
  evaluate: function () {
    // UI removed: tape inputs and loop buttons were disabled while running

    curCommands = this.$["num" + (curTpr + 1)]
      .get("value")
      .replace(/(\n)+/gi, "test")
      .replace(/test(\+|-|\*)/gi, "$1")
      .replace(/test\[[0-9]\]/gi, "")
      .split("test");
    for (i = 0; i < curCommands.length; i++) {
      //curCommands[i].replace(/(<.{1,4}>)+/ig, "");
      if (curCommands[i] == "") {
        curCommands.splice(i, 1);
      }
    }

    if (curCommands[0] != "") {
      var overflow = 0;
      var prevText = this.$.log.get("value");
      console.log(typeof curCommands);
      if (curCommands != [] && curCommands[0][0] != "[" && curCommands[0][0] != "*" && isNaN(parseInt(curCommands[0]))) {
        this.$.log.set(
          "value",
          prevText +
            "\n" +
            curCommands[0].replace(/(.....)(\+........|\*.....)/gi, "$1") +
            "\nError: Command(s) need to include only numbers and maybe plus signs and dashes",
        );
      } else if (curCommands != []) {
        this.$.log.set("value", prevText + "\n" + curCommands[0].replace(/(.....)(\+........|\*.....)/gi, "$1"));
      }
      var prevText = this.$.log.get("value");
      ranAlready = true;
      var commandStr = curCommands[0];
      switch (commandStr[0]) {
        case "0":
          switch (commandStr[1]) {
            case "0":
              if (commandStr == "00100") {
                this.finishLightOn();
                var curTprStr = this.$["num" + (curTpr + 1)].get("value").split("\n");
                for (g = 0; g < curTprStr.length; g++) {
                  if (curTprStr.indexOf("") != -1) {
                    curTprStr.splice(curTprStr.indexOf(""), 1);
                  }
                  if (curTprStr.indexOf("\n") != -1) {
                    curTprStr.splice(curTprStr.indexOf("\n"), 1);
                  }
                }
                console.log(curTprStr);
                if (straight[curTpr]) curTprStr.shift();
                else curTprStr.push(curTprStr.shift());
                this.$["num" + (curTpr + 1)].set("value", curTprStr.join("\n"));
                this.stop();
              } else if (commandStr == "00200") {
                this.alarmLightOn();
                this.stop();
              }
              break;
            case "1":
              if (commandStr[2] == "1") {
                if (commandStr.slice(3, 5) == "08" || commandStr.slice(3, 5) == "09") {
                  storedValue = this.$["090"].get("content") == "0";
                } else if (parseInt(commandStr.slice(3, 5)) >= 10 && parseInt(commandStr.slice(3, 5)) <= 99) {
                  var checkValue = this.$[commandStr.slice(3, 5)].get("content");
                  storedValue = checkValue[0] == "0";
                }
              } else if (commandStr[2] == "2") {
                if (commandStr.slice(3, 5) == "08" || commandStr.slice(3, 5) == "09") {
                  storedValue = this.$["090"].get("content") == "9";
                } else if (parseInt(commandStr.slice(3, 5)) >= 10 && parseInt(commandStr.slice(3, 5)) <= 99) {
                  var checkValue = this.$[commandStr.slice(3, 5)].get("content");
                  storedValue = checkValue[0] == "9";
                }
              }
              prevText = this.$.log.get("value");
              console.log(storedValue);
              break;
            case "2":
              if (commandStr[2] == "1") {
                this.$.log.set("value", prevText + "\nSign: Skip");
                curTpr = parseInt(commandStr.slice(3, 5)) - 1;
                this.sv6();
              } else if (commandStr[2] == "2" && storedValue) {
                curTpr = parseInt(commandStr.slice(3, 5)) - 1;
                this.sv6();
                var prevText = this.$.log.get("value");
                this.$.log.set("value", prevText + "\nSign: True");
              } else if (commandStr[2] == "2" && !storedValue) {
                var prevText = this.$.log.get("value");
                if (storedValue == null) this.$.log.set("value", prevText + "\nSign: Null");
                else this.$.log.set("value", prevText + "\nSign: False");
              }
              break;
            case "3":
              blkNum = commandStr.slice(2, 3);
              stbCurTpr = commandStr.slice(4);
              done = true;
              this.searchForBlkMarker();
              break;
            case "5":
              if (storedValue) {
                blkNum = commandStr.slice(2, 3);
                stbCurTpr = commandStr.slice(4);
                done = true;
                this.searchForBlkMarker();
              } else if (commandStr[2] == "2" && !storedValue) {
                var prevText = this.$.log.get("value");
                this.searchForBlkMarker();
                this.$.log.set("value", prevText + "\nSign: True");
              } else {
                var prevText = this.$.log.get("value");
                if (storedValue == null) this.$.log.set("value", prevText + "\nSign: Null");
                else this.$.log.set("value", prevText + "\nSign: False");
              }
              break;
            case "7":
              var possibleOutcomes = [
                "lblblblblb",
                "",
                "",
                "5csign8d",
                "5csign8dlb",
                "5csign8dlblb",
                "6csign6d",
                "5csign6d",
                "5csign6dlb",
                "5csign6dlblb",
              ];
              outcomeToBePrinted = possibleOutcomes[parseInt(commandStr.slice(2, 3))];
              break;
          }
          break;
        case "1":
        case "2":
          if (commandStr.slice(1, 3) == "0" + (curTpr + 1).toString()) {
            if (commandStr.slice(1, 3) == "0" + (curTpr + 1).toString()) {
              console.log("Adding to stores...");
              var finStr;
              if (commandStr[5] && commandStr[5] == "*") {
                var s1 = "0" + commandStr.slice(6) + "000";
              } else {
                console.log(commandStr.slice(5, 14));
                if (commandStr.slice(5, 6) == "+") {
                  var s1 = "0" + commandStr.slice(6);
                } else {
                  var s1 = "9" + (99999999 - parseInt(commandStr.slice(6)));
                }
              }
              finStr = s1;
              if (commandStr.slice(3, 5) == "09") {
                while (finStr.length < 16) {
                  finStr = finStr + "0";
                }
              }
              console.log(finStr);
              stores[parseInt(commandStr.slice(3, 5))] = finStr;
            } else if (
              (parseInt(commandStr.slice(3, 5)) - 10) / 9 < 0 &&
              commandStr.slice(3, 5) != "09" &&
              commandStr.slice(3, 5) != "08"
            ) {
              // sanity check for valid store addresses //
              this.$.log.set(
                "value",
                prevText +
                  "Error: The store " +
                  commandStr.slice(3, 5) +
                  ' is invalid. Please send to another store. Substitute "' +
                  commandStr.slice(3, 5) +
                  'with "08-99"',
              );
            } else if (parseInt(commandStr.slice(3, 5)) == 8) {
              // accumulator store 08 //
              console.log("08ing");
            } else if (parseInt(commandStr.slice(3, 5)) == 9) {
              // accumulator store 09//
              console.log("09ing");
            } else if (this.$[commandStr.slice(3, 5)] == " " || !between(parseInt(commandStr.slice(3, 5)), 8, 99)) {
              this.$.log.set("value", prevText + "Error: you must pick a defined store, or the accumulator. Valid stores are 09-99.");
            }
          } else if (parseInt(commandStr.slice(3, 5)) == 1 || parseInt(commandStr.slice(3, 5)) == 3) {
            console.log("Printing.....");
            prevText = this.$.printer.get("content");
            prevText += outcomeToBePrinted;
            prevText = prevText.replace(/lb/g, "\n");
            if (commandStr.slice(1, 3) != "08" && commandStr.slice(1, 3) != "09") {
              var printText = this.$[commandStr.slice(1, 3)].get("content");
            } else if (commandStr.slice(1, 3) == "08") {
              var printText = this.$[commandStr.slice(1, 3)].get("content")[0] + this.$[commandStr.slice(1, 3)].get("content").slice(8, 15);
            } else if (commandStr.slice(1, 3) == "09") {
              var printText = this.$[commandStr.slice(1, 3)].get("content").slice(0, 9);
            }
            var printVal;
            console.log(printText);
            if (printText[0] == "0") {
              prevText = prevText.replace(/sign/g, "+");
              printVal = parseInt(printText);
            } else {
              prevText = prevText.replace(/sign/g, "-");
              printVal = 999999999 - parseInt(printText);
            }
            if (outcomeToBePrinted != "lblblblblb") {
              var fixedValue;
              printVal = printVal / 10000000;
              fixedValue = printVal.toFixed(7);
              prevText = prevText.replace(/8d/g, fixedValue);
              prevText = prevText.replace(/6d/g, Math.round(printVal / 100) / 100000);
            }
            prevText = prevText.replace(/5c/g, "  ");
            prevText = prevText.replace(/6c/g, "   ");
            this.$.printer.set("content", prevText);
          } else if (
            this.$[commandStr.slice(1, 3)] &&
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            this.$[commandStr.slice(1, 3)].get("content") != " "
          ) {
            var s1 = parseInt(this.$[commandStr.slice(3, 5)].get("content"));
            var s2 = parseInt(this.$[commandStr.slice(1, 3)].get("content"));
            if (commandStr.slice(1, 3) == "09") {
              s2 = Math.round(s2 / 10000000 - 0.5);
            }
            var s3 = s1 + s2;
            if (Math.round(s3 / 1000000000 - 0.5)) {
              s3 = s3 - 1000000000 + 1;
            }
            console.log("s1 - " + s1);
            console.log("s2 - " + s2);
            console.log("s3 - " + s3);
            finStr = s3.toString();
            console.log("finStr - " + finStr);
            while (finStr.length < 9) finStr = "0" + finStr;
            if (commandStr.slice(3, 5) == "09") {
              while (finStr.length < 16) {
                finStr = finStr + "0";
              }
            }

            console.log(finStr);
            console.log("Adding stores together!");
            stores[parseInt(commandStr.slice(3, 5))] = finStr;
            if (commandStr[0] == "2") {
              stores[parseInt(commandStr.slice(1, 3))] = "000000000";
              ss = true;
              cmdString = commandStr.slice(1, 3);
              this.updateStores();
            }
          }
          if (commandStr.slice(3, 5) == "00" && commandStr.slice(1, 3) != "09") {
            console.log("first if statement!");
            sss = true;
            cmdString2 = commandStr.slice(1, 3);
            this.updateSecStores();
          } else if (commandStr.slice(3, 5) == "00" && commandStr.slice(1, 3) == "09") {
            this.updateTriStores();
          } else if (
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            commandStr.slice(2, 3) == curTpr + 1
          ) {
            console.log("Updating");
            ss = true;
            cmdString = commandStr.slice(3, 5);
            this.updateStores();
          } else if (commandStr.slice(1, 5).indexOf(curTpr + "09") != -1) {
            this.updateQudStores();
          } else if (commandStr.slice(1, 5).indexOf(curTpr + "08") != -1) {
            this.updateQudStores();
          } else if (
            this.$[commandStr.slice(1, 3)] &&
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            this.$[commandStr.slice(1, 3)].get("content") != " "
          ) {
            console.log("Updating 2");
            ss = true;
            cmdString = commandStr.slice(3, 5);
            this.updateStores();
          }
          console.log(stores);
          break;
        case "3":
        case "4":
          if (commandStr.slice(2, 3) == (curTpr + 1).toString()) {
            if (commandStr.slice(1, 3) == "0" + (curTpr + 1).toString()) {
              console.log("Adding to stores...");
              var finStr;
              if (commandStr[5] && commandStr[5] == "*") {
                var s1 = "0" + commandStr.slice(6) + "000";
              } else {
                console.log(commandStr.slice(5, 14));
                if (commandStr.slice(5, 6) == "+") {
                  var s1 = "0" + commandStr.slice(6);
                } else {
                  var s1 = "9" + (99999999 - parseInt(commandStr.slice(6)));
                }
              }
              finStr = s1;
              console.log(finStr);
              stores[parseInt(commandStr.slice(3, 5))] = finStr;
            } else if (
              (parseInt(commandStr.slice(3, 5)) - 10) / 9 < 0 &&
              commandStr.slice(3, 5) != "09" &&
              commandStr.slice(3, 5) != "08"
            ) {
              // sanity check for valid store addresses //
              this.$.log.set(
                "value",
                prevText +
                  "Error: The store " +
                  commandStr.slice(3, 5) +
                  ' is invalid. Please send to another store. Substitute "' +
                  commandStr.slice(3, 5) +
                  'with "08-99"',
              );
            } else if (parseInt(commandStr.slice(3, 5)) == 8) {
              // accumulator store 08 //
              console.log("08ing");
            } else if (parseInt(commandStr.slice(3, 5)) == 9) {
              // accumulator store 09//
              console.log("09ing");
            } else if (this.$[commandStr.slice(3, 5)] == " " || !between(parseInt(commandStr.slice(3, 5)), 8, 99)) {
              this.$.log.set("value", prevText + "Error: you must pick a defined store, or the accumulator. Valid stores are 09-99.");
            }
          } else if (parseInt(commandStr.slice(3, 5)) == 1 || parseInt(commandStr.slice(3, 5)) == 3) {
            console.log("Printing.....");
            prevText = this.$.printer.get("content");
            prevText += outcomeToBePrinted;
            prevText = prevText.replace(/lb/g, "\n");
            if (commandStr.slice(1, 3) != "08" && commandStr.slice(1, 3) != "09") {
              var printText = this.$[commandStr.slice(1, 3)].get("content");
            } else if (commandStr.slice(1, 3) == "08") {
              var printText = this.$[commandStr.slice(1, 3)].get("content")[0] + this.$[commandStr.slice(1, 3)].get("content").slice(8, 15);
            } else if (commandStr.slice(1, 3) != "09") {
              var printText = this.$[commandStr.slice(1, 3)].get("content")[0] + this.$[commandStr.slice(1, 3)].get("content").slice(8, 15);
            }
            var printVal;
            if (printText[0] == "0") {
              prevText = prevText.replace(/sign/g, "+");
              printVal = parseInt(printText);
            } else {
              prevText = prevText.replace(/sign/g, "-");
              printVal = 999999999 - parseInt(printText);
            }
            if (outcomeToBePrinted != "lblblblblb") {
              prevText = prevText.replace(/8d/g, printVal / 10000000);
              prevText = prevText.replace(/6d/g, Math.round(printVal / 100) / 100000);
            }
            prevText = prevText.replace(/5c/g, "  ");
            prevText = prevText.replace(/6c/g, "   ");
            this.$.printer.set("content", prevText);
          } else if (
            this.$[commandStr.slice(1, 3)] &&
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            this.$[commandStr.slice(1, 3)].get("content") != " "
          ) {
            var s1 = parseInt(this.$[commandStr.slice(3, 5)].get("content"));
            var s2 = 999999999 - parseInt(this.$[commandStr.slice(1, 3)].get("content"));
            var s3 = s1 + s2;
            if (Math.round(s3 / 1000000000 - 0.5)) {
              s3 = s3 - 1000000000 + 1;
            }
            console.log("s1 - " + s1);
            console.log("s2 - " + s2);
            console.log("s3 - " + s3);
            finStr = s3.toString();
            console.log("finStr - " + finStr);
            while (finStr.length < 9) finStr = "0" + finStr;
            console.log(finStr);
            console.log("Adding stores together!");
            stores[parseInt(commandStr.slice(3, 5))] = finStr;
            if (commandStr[0] == "4") {
              stores[parseInt(commandStr.slice(1, 3))] = "000000000";
              ss = true;
              cmdString = commandStr.slice(1, 3);
              this.updateStores();
            }
          }
          if (commandStr.slice(3, 5) == "00" && commandStr.slice(1, 3) != "09") {
            console.log("first if statement!");
            sss = true;
            cmdString2 = commandStr.slice(1, 3);
            this.updateSecStores();
          } else if (
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            commandStr.slice(2, 3) == curTpr + 1 &&
            commandStr.slice(3, 5) != "09" &&
            commandStr.slice(3, 5) != "08"
          ) {
            console.log("Updating");
            ss = true;
            cmdString = commandStr.slice(3, 5);
            this.updateStores();
          } else if (commandStr.slice(1, 5).indexOf(curTpr + "09") != -1) {
            this.updateQudStores();
          } else if (commandStr.slice(1, 5).indexOf(curTpr + "08") != -1) {
            this.updateQudStores();
          } else if (
            this.$[commandStr.slice(1, 3)] &&
            this.$[commandStr.slice(3, 5)] &&
            this.$[commandStr.slice(3, 5)].get("content") != " " &&
            this.$[commandStr.slice(1, 3)].get("content") != " "
          ) {
            console.log("Updating 2");
            ss = true;
            cmdString = commandStr.slice(3, 5);
            this.updateStores();
          }
          console.log(stores);
          break;
        case "5":
          console.log(this.$[commandStr.slice(1, 3)].get("content"));
          if (this.$[commandStr.slice(1, 3)].get("content") != " " && this.$[commandStr.slice(3, 5)].get("content") != " ") {
            var s1 = parseInt(this.$[commandStr.slice(3, 5)].get("content"));
            var s2 = parseInt(this.$[commandStr.slice(1, 3)].get("content"));
            var s3 = s1 * s2;
            //							s3 = Math.round(s3);
            //							var carry_out = Math.round((s3/1000000000)-0.5);
            console.log("s1 - " + s1);
            console.log("s2 - " + s2);
            console.log("s3 - " + s3);
            //							if (carry_out) {
            //								s3 = (s3 - (carry_out * 1000000000))+carry_out;
            //							}
            finStr = s3.toString();
            console.log("finStr - " + finStr);
            while (finStr.length < 16) finStr = "0" + finStr;

            console.log(finStr);

            stores[9] = finStr;
          } else {
            this.$.log.set("value", prevText + "Error: you must pick a defined store, or the accumulator. Valid stores are 09-99.");
          }
          if (commandStr.slice(3, 5) == "00" && commandStr.slice(1, 3) != "09") {
          } else if (this.$[commandStr.slice(3, 5)].get("content") != " " && commandStr.slice(3, 5) != "00") {
            cmdString = commandStr.slice(1, 3);
            this.updateQudStores();
            sss = true;
            cmdString2 = commandStr.slice(3, 5);
            this.updateSecStores();
          }
          console.log(stores);
          break;
        case "6":
          console.log(this.$[commandStr.slice(1, 3)].get("content"));
          if (this.$[commandStr.slice(1, 3)].get("content") != " " && this.$[commandStr.slice(3, 5)].get("content") != " ") {
            var s1 = parseInt(stores[9].slice(0, 9));
            var s2 = parseInt(this.$[commandStr.slice(1, 3)].get("content"));
            var s3 = (s1 / s2) * 10000000;
            console.log("s1 - " + s1);
            console.log("s2 - " + s2);
            console.log("s3 - " + s3);
            s3 = Math.round(s3);
            finStr = s3.toString();
            console.log("finStr - " + finStr);
            while (finStr.length < 9) finStr = "0" + finStr;

            console.log(finStr);

            stores[commandStr.slice(3, 5)] = finStr;
          } else {
            this.$.log.set("value", prevText + "Error: you must pick a defined store, or the accumulator. Valid stores are 09-99.");
          }
          if (commandStr.slice(3, 5) == "00" && commandStr.slice(1, 3) != "09") {
          } else if (this.$[commandStr.slice(3, 5)].get("content") != " " && commandStr.slice(3, 5) != "00") {
            console.log("Updating 6");
            ss = true;
            cmdString = commandStr.slice(3, 5);
            this.updateStores();
            //							cmdString = commandStr.slice(1, 3);
            //							this.updateQudStores();
            //							sss = true;
            //							cmdString2 = commandStr.slice(3, 5);
            //							this.updateSecStores();
          }
          console.log(stores);
          break;
      }

      if (!done) enyo.job("j1", enyo.bind(this, "switchback"), 1506);
      if (this.$["num" + (curTpr + 1)].get("value").indexOf(/<[^>]+>/gi) != -1 || this.$["num" + (curTpr + 1)].get("value") == "") {
        this.finishLightOn();
        this.stop();
      }
    }
  },
  switchback: function () {
    var curTprStr = this.$["num" + (curTpr + 1)].get("value").split("\n");
    for (g = 0; g < curTprStr.length; g++) {
      if (curTprStr.indexOf("") != -1) {
        curTprStr.splice(curTprStr.indexOf(""), 1);
      }
      if (curTprStr.indexOf("\n") != -1) {
        curTprStr.splice(curTprStr.indexOf("\n"), 1);
      }
    }
    console.log(curTprStr);
    if (straight[curTpr]) curTprStr.shift();
    else curTprStr.push(curTprStr.shift());
    this.$["num" + (curTpr + 1)].set("value", curTprStr.join("\n"));
    if (curTprStr != "") this.evaluate();
    else {
      this.finishLightOn();
      this.stop();
    }
  },
  updateStores: function () {
    console.log("updateStores!");
    console.log(cmdString + "-" + s);
    this.$[cmdString].set("content", stores[parseInt(cmdString)]);
    console.log(s);
    console.log(stores);
    s = 0;
    ss = false;
  },
  updateSecStores: function () {
    console.log("updateSecStores!");
    console.log(cmdString2 + "-" + s);
    this.$[cmdString2].set("content", "000000000");
    stores[parseInt(cmdString2)] = "000000000";
    console.log(stores);
    s = 0;
    sss = false;
    cmdString2 = "";
  },
  updateTriStores: function () {
    this.$["09"].set("content", "0000000000000000");
  },
  updateQudStores: function () {
    this.$["09"].set("content", stores[9]);
  },
  stop: function () {
    done = true;
    // UI removed: tape inputs and loop buttons were re-enabled here
  },
  sv6: function () {
    this.evaluate();
  },
  searchForBlkMarker: function () {
    if (done) {
      if (this.$["num" + stbCurTpr].get("value") != "" && done) {
        var curTprStr = this.$["num" + stbCurTpr].get("value").split("\n");
        console.log(blkNum + ":" + curTprStr[0]);
        if (curTprStr[0] == "[" + blkNum + "]") {
          console.log("YESSSSSSS!");
          foundBlkMarker = true;
          done = false;
        }
        console.log(foundBlkMarker + ":" + done);
        for (g = 0; g < curTprStr.length; g++) {
          if (curTprStr.indexOf("") != -1) {
            curTprStr.splice(curTprStr.indexOf(""), 1);
          }
          if (curTprStr.indexOf("\n") != -1) {
            curTprStr.splice(curTprStr.indexOf("\n"), 1);
          }
        }
        console.log(curTprStr);
        if (straight[parseInt(stbCurTpr) - 1]) curTprStr.shift();
        else curTprStr.push(curTprStr.shift());
        this.$["num" + stbCurTpr].set("value", curTprStr.join("\n"));
      }
      if (!foundBlkMarker && this.$["num" + stbCurTpr].get("value") == "") {
        var prevText = this.$.log.get("value");
        if (runForTheFirstTime) {
          this.$.log.set("value", prevText + "\nBlock marker not found");
        } else {
          this.alarmLightOn();
          this.$.log.set("value", prevText + "\nBlock marker 1 not found on first tape reader");
          this.stop();
        }

        done = false;
        if (stbCurTpr != curTpr) {
          var curTprStr = this.$["num" + (curTpr + 1)].get("value").split("\n");
          for (g = 0; g < curTprStr.length; g++) {
            if (curTprStr.indexOf("") != -1) {
              curTprStr.splice(curTprStr.indexOf(""), 1);
            }
            if (curTprStr.indexOf("\n") != -1) {
              curTprStr.splice(curTprStr.indexOf("\n"), 1);
            }
          }
          console.log(curTprStr);
          if (straight[parseInt(curTpr) - 1]) curTprStr.shift();
          else curTprStr.push(curTprStr.shift());
          this.$["num" + (curTpr + 1)].set("value", curTprStr.join("\n"));
        }
        done = false;

        this.switchback();
      } else if (foundBlkMarker && this.$["num" + stbCurTpr].get("value") != "") {
        var curTprStr = this.$["num" + (curTpr + 1)].get("value").split("\n");
        for (g = 0; g < curTprStr.length; g++) {
          if (curTprStr.indexOf("") != -1) {
            curTprStr.splice(curTprStr.indexOf(""), 1);
          }
          if (curTprStr.indexOf("\n") != -1) {
            curTprStr.splice(curTprStr.indexOf("\n"), 1);
          }
        }
        if (stbCurTpr != curTpr + 1) {
          console.log(curTprStr);
          if (straight[parseInt(curTpr) - 1]) curTprStr.shift();
          else curTprStr.push(curTprStr.shift());
          this.$["num" + (curTpr + 1)].set("value", curTprStr.join("\n"));
        }
        done = false;
        var prevText = this.$.log.get("value");
        if (!runForTheFirstTime) {
          this.$.log.set("value", prevText + "\n[1]");
        }
        this.evaluate();
        runForTheFirstTime = true;
        foundBlkMarker = false;
      } else if (!foundBlkMarker && this.$["num" + stbCurTpr].get("value") != "") {
        ranAlready = true;
        this.sv5();
        console.log("Ugghhhh!");
      }
    }
    console.log(done);
  },
  sv5: function () {
    enyo.job("j5", enyo.bind(this, "searchForBlkMarker"), 712);
  },
  alarmLightOn: function () {
    // UI removed: lit the alarm light
  },
  alarmLightOff: function () {
    // UI removed: cleared the alarm light
  },
  finishLightOn: function () {
    // UI removed: lit the finish light
  },
  finishLightOff: function () {
    // UI removed: cleared the finish light
  },
  resetTapes: function () {
    this.finishLightOff();
    this.alarmLightOff();
    for (var ts = 1; ts <= 4; ts++) {
      if (tapeValues[ts - 1] == undefined) tapeValues[ts - 1] = "";
      this.$["num" + ts].set("value", tapeValues[ts - 1]);
    }
    curTpr = 0;
    curCommands = this.$.num1
      .get("value")
      .replace(/\n(\+|-|\*)/gi, "$1")
      .replace(/\n\[[0-9]\]/gi, "")
      .split("\n");
    for (i = 0; i < curCommands.length; i++) {
      //curCommands[i].replace(/(<.{1,4}>)+/ig, "");
      if (curCommands[i] == "") {
        curCommands.splice(i, 1);
      }
    }
    enyo.log(curCommands);
    for (var c = 0; c < 4; c++) {
      tpr[parseInt(this.$["num" + (c + 1)].name.substring(3)) - 1] = this.$["num" + (c + 1)].get("value");
    }
    runForTheFirstTime = false;
    done = true;
  },
};
