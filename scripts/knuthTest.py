import random

def knuth():
    array = [ 0, 1, 2, 3, 4, 5 ]

    numberToPull = 3

    for startIndex in xrange(numberToPull):
        randomIndex = random.randint(startIndex, len(array)-1)
        # swap
        temp = array[startIndex]
        array[startIndex] = array[randomIndex]
        array[randomIndex] = temp
    #print "final array:", array
    print array[:numberToPull]

#run tests    
for step in xrange(10):
    print "test #", step
    knuth()
    print
    

